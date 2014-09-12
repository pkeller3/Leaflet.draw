L.Draw = {};

L.Draw.Feature = L.Handler.extend({
	includes: L.Mixin.Events,

	initialize: function (map, options) {
		this._map = map;
		this._container = map._container;
		this._overlayPane = map._panes.overlayPane;
		this._popupPane = map._panes.popupPane;

		// Merge default shapeOptions options with custom shapeOptions
		if (options && options.shapeOptions) {
			options.shapeOptions = L.Util.extend({}, this.options.shapeOptions, options.shapeOptions);
		}
		L.setOptions(this, options);
	},

	enable: function () {
		if (this._enabled) {
			return;
		}

		L.Handler.prototype.enable.call(this);

		this.fire('enabled', {
			handler: this.type
		});

		this._map.fire('draw:drawstart', {
			layerType: this.type
		});
	},

	disable: function () {
		if (!this._enabled) {
			return;
		}

		L.Handler.prototype.disable.call(this);

		this._map.fire('draw:drawstop', {
			layerType: this.type
		});

		this.fire('disabled', {
			handler: this.type
		});
	},

	addHooks: function () {
		var map = this._map;

		if (map) {
			L.DomUtil.disableTextSelection();

			map.getContainer().focus();

			L.DomEvent.on(this._container, 'keyup', this._cancelDrawing, this);
		}
	},

	removeHooks: function () {
		if (this._map) {
			L.DomUtil.enableTextSelection();

			L.DomEvent.off(this._container, 'keyup', this._cancelDrawing, this);
		}
	},

	setOptions: function (options) {
		L.setOptions(this, options);
	},

	_fireCreatedEvent: function (layer) {
		this._map.fire('draw:created', {
			layer: layer,
			layerType: this.type
		});
	},

	// Cancel drawing when the escape key is pressed
	_cancelDrawing: function (e) {
		if (e.keyCode === 27) {
			this.disable();
		}
	}
});;L.Draw.Marker = L.Draw.Feature.extend({
	statics: {
		TYPE: 'marker'
	},

	options: {
		icon: new L.Icon.Default(),
		repeatMode: false,
		zIndexOffset: 2000 // This should be > than the highest z-index any markers
	},

	initialize: function (map, options) {
		// Save the type so super can fire, need to do this as cannot do this.TYPE :(
		this.type = L.Draw.Marker.TYPE;

		L.Draw.Feature.prototype.initialize.call(this, map, options);
	},

	addHooks: function () {
		L.Draw.Feature.prototype.addHooks.call(this);

		if (this._map) {

			// Same mouseMarker as in Draw.Polyline
			if (!this._mouseMarker) {
				this._mouseMarker = L.marker(this._map.getCenter(), {
					icon: L.divIcon({
						className: 'leaflet-mouse-marker',
						iconAnchor: [20, 20],
						iconSize: [40, 40]
					}),
					opacity: 0,
					zIndexOffset: this.options.zIndexOffset
				});
			}

			this._mouseMarker
				.on('click', this._onClick, this)
				.addTo(this._map);

			this._map.on('mousemove', this._onMouseMove, this);
		}
	},

	removeHooks: function () {
		L.Draw.Feature.prototype.removeHooks.call(this);

		if (this._map) {
			if (this._marker) {
				this._marker.off('click', this._onClick, this);
				this._map
					.off('click', this._onClick, this)
					.removeLayer(this._marker);
				delete this._marker;
			}

			this._mouseMarker.off('click', this._onClick, this);
			this._map.removeLayer(this._mouseMarker);
			delete this._mouseMarker;

			this._map.off('mousemove', this._onMouseMove, this);
		}
	},

	_onMouseMove: function (e) {
		var latlng = e.latlng;

		this._mouseMarker.setLatLng(latlng);

		if (!this._marker) {
			this._marker = new L.Marker(latlng, {
				icon: this.options.icon,
				zIndexOffset: this.options.zIndexOffset
			});
			// Bind to both marker and map to make sure we get the click event.
			this._marker.on('click', this._onClick, this);
			this._map
				.on('click', this._onClick, this)
				.addLayer(this._marker);
		} else {
			latlng = this._mouseMarker.getLatLng();
			this._marker.setLatLng(latlng);
		}
	},

	_onClick: function () {
		this._fireCreatedEvent();

		this.disable();
		if (this.options.repeatMode) {
			this.enable();
		}
	},

	_fireCreatedEvent: function () {

		var marker = new L.Marker(this._marker.getLatLng(), {
			icon: this.options.icon
		});
		L.Draw.Feature.prototype._fireCreatedEvent.call(this, marker);
	}
});;/*
	Design choice: I didn't run with emulating a click event here as others have done, because it bugged out on me. 
	Getting it to work when you have other features on the map was problematic, as they would steel the click event. 
	The scenario with touch and mouse combination i.e. microsoft surface was a problem too.
	I went with the touch events which are slightly more code but they were needed for polylineTouch and polygonTouch anyway. 
	So when it's all refactored this will be quite tidy. 
*/
L.Draw.MarkerTouch = L.Draw.Marker.extend({
	initialize: function (map, options) {
		L.Draw.Marker.prototype.initialize.call(this, map, options);
	},
	addHooks: function () {
		L.Draw.Marker.prototype.addHooks.call(this);
		L.DomEvent.addListener(this._map._container, 'touchstart', this._onTouchStart, this);
		L.DomEvent.addListener(this._map._container, 'touchmove', this._onTouchMove, this);
		L.DomEvent.addListener(this._map._container, 'touchend', this._onTouchEnd, this);
	},
	removeHooks: function () {
		L.Draw.Marker.prototype.removeHooks.call(this);
		if (this._map) {
			L.DomEvent.removeListener(this._map._container, 'touchstart', this._onTouchStart, this);
			L.DomEvent.removeListener(this._map._container, 'touchmove', this._onTouchMove, this);
			L.DomEvent.addListener(this._map._container, 'touchend', this._onTouchEnd, this);
		}
	},
	_normaliseEvent: function (e) {
		L.DomUtil.disableImageDrag();
		L.DomUtil.disableTextSelection();

		var first = e.touches ? e.touches[0] : e;
		var containerPoint = this._map.mouseEventToContainerPoint(first),
			layerPoint = this._map.mouseEventToLayerPoint(first),
			latlng = this._map.layerPointToLatLng(layerPoint);

		return {
			latlng: latlng,
			layerPoint: layerPoint,
			containerPoint: containerPoint,
			clientX: first.clientX,
			clientY: first.clientY,
			originalEvent: e
		};
	},
	_onTouchStart: function (e) {
		// Make sure it's a one fingure gesture and record the starting point
		if (e.touches.length === 1) {
			var normalisedEvent = this._normaliseEvent(e);
			this._currentLatLng = normalisedEvent.latlng;
			this._touchOriginPoint = L.point(normalisedEvent.clientX, normalisedEvent.clientY);
		}
	},
	_onTouchMove: function (e) {
		// Ensure we saved the starting point
		if (this._touchOriginPoint) {
			var normalisedEvent = this._normaliseEvent(e);
			this._touchEndPoint = L.point(normalisedEvent.clientX, normalisedEvent.clientY);
		}
	},
	_onTouchEnd: function () {
		// Make sure we have a starting point
		if (this._touchOriginPoint) {

			if (this._touchEndPoint) {
				// If we have an end point we need to see how much it's moved before we decide if we save
				// We detect clicks within a certain tolerance, otherwise let it
				// be interpreted as a drag by the map
				var distanceMoved = L.point(this._touchEndPoint).distanceTo(this._touchOriginPoint);
				if (Math.abs(distanceMoved) < 9 * (window.devicePixelRatio || 1)) {
					this._fireTouchCreatedEvent();
				}
			} else {
				// If there is no _touchEndPoint we save straight away as this means no movement i.e. definetly a click.
				this._fireTouchCreatedEvent();
			}
		}
		// No matter what remove the start and end point ready for the next touch.
		this._touchOriginPoint = null;
		this._currentLatLng = null;
		this._touchEndPoint = null;
	},
	_fireTouchCreatedEvent: function () {
		var marker = new L.Marker(this._currentLatLng, {
			icon: this.options.icon
		});
		L.Draw.Feature.prototype._fireCreatedEvent.call(this, marker);
		this.disable();
		if (this.options.repeatMode) {
			this.enable();
		}
	}
});;L.Draw.Polyline = L.Draw.Feature.extend({
	statics: {
		TYPE: 'polyline'
	},

	Poly: L.Polyline,

	options: {
		allowIntersection: true,
		repeatMode: false,
		drawError: {
			color: '#b00b00',
			timeout: 2500
		},
		icon: new L.DivIcon({
			iconSize: new L.Point(10, 10),
			className: 'leaflet-div-icon leaflet-editing-icon'
		}),
		guidelineDistance: 20,
		maxGuideLineLength: 4000,
		shapeOptions: {
			stroke: true,
			color: '#f06eaa',
			weight: 4,
			opacity: 0.5,
			fill: false,
			clickable: true
		},
		metric: true, // Whether to use the metric meaurement system or imperial
		zIndexOffset: 2000 // This should be > than the highest z-index any map layers
	},

	initialize: function (map, options) {

		// Merge default drawError options with custom options
		if (options && options.drawError) {
			options.drawError = L.Util.extend({}, this.options.drawError, options.drawError);
		}

		// Save the type so super can fire, need to do this as cannot do this.TYPE :(
		this.type = L.Draw.Polyline.TYPE;

		L.Draw.Feature.prototype.initialize.call(this, map, options);
	},

	addHooks: function () {
		L.Draw.Feature.prototype.addHooks.call(this);
		if (this._map) {
			this._markers = [];

			this._markerGroup = new L.LayerGroup();
			this._map.addLayer(this._markerGroup);

			this._poly = new L.Polyline([], this.options.shapeOptions);

			// Make a transparent marker that will used to catch click events. These click
			// events will create the vertices. We need to do this so we can ensure that
			// we can create vertices over other map layers (markers, vector layers). We
			// also do not want to trigger any click handlers of objects we are clicking on
			// while drawing.
			if (!this._mouseMarker) {
				this._mouseMarker = L.marker(this._map.getCenter(), {
					icon: L.divIcon({
						className: 'leaflet-mouse-marker',
						iconAnchor: [20, 20],
						iconSize: [40, 40]
					}),
					opacity: 0,
					zIndexOffset: this.options.zIndexOffset
				});
			}

			this._mouseMarker
				.on('mousedown', this._onMouseDown, this)
				.addTo(this._map);

			this._map
				.on('mousemove', this._onMouseMove, this)
				.on('mouseup', this._onMouseUp, this)
				.on('zoomend', this._onZoomEnd, this);
		}
	},

	removeHooks: function () {
		L.Draw.Feature.prototype.removeHooks.call(this);

		this._clearHideErrorTimeout();

		this._cleanUpShape();

		// remove markers from map
		this._map.removeLayer(this._markerGroup);
		delete this._markerGroup;
		delete this._markers;

		this._map.removeLayer(this._poly);
		delete this._poly;

		this._mouseMarker
			.off('mousedown', this._onMouseDown, this)
			.off('mouseup', this._onMouseUp, this);
		this._map.removeLayer(this._mouseMarker);
		delete this._mouseMarker;

		// clean up DOM
		this._clearGuides();

		this._map
			.off('mousemove', this._onMouseMove, this)
			.off('zoomend', this._onZoomEnd, this);
	},

	deleteLastVertex: function () {
		if (this._markers.length <= 1) {
			return;
		}

		var lastMarker = this._markers.pop(),
			poly = this._poly,
			latlng = this._poly.spliceLatLngs(poly.getLatLngs().length - 1, 1)[0];

		this._markerGroup.removeLayer(lastMarker);

		if (poly.getLatLngs().length < 2) {
			this._map.removeLayer(poly);
		}

		this._vertexChanged(latlng, false);
	},

	addVertex: function (latlng) {
		this._markers.push(this._createMarker(latlng));

		this._poly.addLatLng(latlng);

		if (this._poly.getLatLngs().length === 2) {
			this._map.addLayer(this._poly);
		}

		this._vertexChanged(latlng, true);
	},

	_finishShape: function () {
		this._fireCreatedEvent();
		this.disable();
		if (this.options.repeatMode) {
			this.enable();
		}
	},

	//Called to verify the shape is valid when the user tries to finish it
	//Return false if the shape is not valid
	_shapeIsValid: function () {
		return true;
	},

	_onZoomEnd: function () {
		this._updateGuide();
	},

	_onMouseMove: function (e) {
		var newPos = e.layerPoint,
			latlng = e.latlng;

		// Save latlng
		// should this be moved to _updateGuide() ?
		this._currentLatLng = latlng;

		// Update the guide line
		this._updateGuide(newPos);

		// Update the mouse marker position
		this._mouseMarker.setLatLng(latlng);

		L.DomEvent.preventDefault(e.originalEvent);
	},

	_vertexChanged: function () {
		this._updateFinishHandler();

		this._clearGuides();
	},

	_onMouseDown: function (e) {
		var originalEvent = e.originalEvent;
		this._mouseDownOrigin = L.point(originalEvent.clientX, originalEvent.clientY);
	},

	_onMouseUp: function (e) {
		if (this._mouseDownOrigin) {
			// We detect clicks within a certain tolerance, otherwise let it
			// be interpreted as a drag by the map
			var distance = L.point(e.originalEvent.clientX, e.originalEvent.clientY)
				.distanceTo(this._mouseDownOrigin);
			if (Math.abs(distance) < 9 * (window.devicePixelRatio || 1)) {
				this.addVertex(e.latlng);
			}
		}
		this._mouseDownOrigin = null;
	},

	_updateFinishHandler: function () {
		var markerCount = this._markers.length;
		// The last marker should have a click handler to close the polyline
		if (markerCount > 1) {
			this._markers[markerCount - 1].on('click', this._finishShape, this);
		}

		// Remove the old marker click handler (as only the last point should close the polyline)
		if (markerCount > 2) {
			this._markers[markerCount - 2].off('click', this._finishShape, this);
		}
	},

	_createMarker: function (latlng) {
		var marker = new L.Marker(latlng, {
			icon: this.options.icon,
			zIndexOffset: this.options.zIndexOffset * 2
		});

		this._markerGroup.addLayer(marker);

		return marker;
	},

	_updateGuide: function (newPos) {
		var markerCount = this._markers.length;

		if (markerCount > 0) {
			newPos = newPos || this._map.latLngToLayerPoint(this._currentLatLng);

			// draw the guide line
			this._clearGuides();
			this._drawGuide(
				this._map.latLngToLayerPoint(this._markers[markerCount - 1].getLatLng()),
				newPos
			);
		}
	},

	_drawGuide: function (pointA, pointB) {
		var length = Math.floor(Math.sqrt(Math.pow((pointB.x - pointA.x), 2) + Math.pow((pointB.y - pointA.y), 2))),
			guidelineDistance = this.options.guidelineDistance,
			maxGuideLineLength = this.options.maxGuideLineLength,
			// Only draw a guideline with a max length
			i = length > maxGuideLineLength ? length - maxGuideLineLength : guidelineDistance,
			fraction,
			dashPoint,
			dash;

		//create the guides container if we haven't yet
		if (!this._guidesContainer) {
			this._guidesContainer = L.DomUtil.create('div', 'leaflet-draw-guides', this._overlayPane);
		}

		//draw a dash every GuildeLineDistance
		for (; i < length; i += this.options.guidelineDistance) {
			//work out fraction along line we are
			fraction = i / length;

			//calculate new x,y point
			dashPoint = {
				x: Math.floor((pointA.x * (1 - fraction)) + (fraction * pointB.x)),
				y: Math.floor((pointA.y * (1 - fraction)) + (fraction * pointB.y))
			};

			//add guide dash to guide container
			dash = L.DomUtil.create('div', 'leaflet-draw-guide-dash', this._guidesContainer);
			dash.style.backgroundColor = !this._errorShown ? this.options.shapeOptions.color : this.options.drawError.color;

			L.DomUtil.setPosition(dash, dashPoint);
		}
	},

	_updateGuideColor: function (color) {
		if (this._guidesContainer) {
			for (var i = 0, l = this._guidesContainer.childNodes.length; i < l; i++) {
				this._guidesContainer.childNodes[i].style.backgroundColor = color;
			}
		}
	},

	// removes all child elements (guide dashes) from the guides container
	_clearGuides: function () {
		if (this._guidesContainer) {
			while (this._guidesContainer.firstChild) {
				this._guidesContainer.removeChild(this._guidesContainer.firstChild);
			}
		}
	},

	_clearHideErrorTimeout: function () {
		if (this._hideErrorTimeout) {
			clearTimeout(this._hideErrorTimeout);
			this._hideErrorTimeout = null;
		}
	},

	_cleanUpShape: function () {
		if (this._markers.length > 1) {
			this._markers[this._markers.length - 1].off('click', this._finishShape, this);
		}
	},

	_fireCreatedEvent: function () {
		var poly = new this.Poly(this._poly.getLatLngs(), this.options.shapeOptions);
		L.Draw.Feature.prototype._fireCreatedEvent.call(this, poly);
	}
});;L.Draw.PolylineTouch = L.Draw.Polyline.extend({
	initialize: function (map, options) {
		L.Draw.Polyline.prototype.initialize.call(this, map, options);
	},
	addHooks: function () {
		L.Draw.Polyline.prototype.addHooks.call(this);
		L.DomEvent.addListener(this._map._container, 'touchstart', this._onTouchStart, this);
		L.DomEvent.addListener(this._map._container, 'touchmove', this._onTouchMove, this);
		L.DomEvent.addListener(this._map._container, 'touchend', this._onTouchEnd, this);
	},
	removeHooks: function () {
		L.Draw.Polyline.prototype.removeHooks.call(this);
		if (this._map) {
			L.DomEvent.removeListener(this._map._container, 'touchstart', this._onTouchStart, this);
			L.DomEvent.removeListener(this._map._container, 'touchmove', this._onTouchMove, this);
			L.DomEvent.addListener(this._map._container, 'touchend', this._onTouchEnd, this);
		}
	},
	_normaliseEvent: function (e) {
		L.DomUtil.disableImageDrag();
		L.DomUtil.disableTextSelection();

		var first = e.touches ? e.touches[0] : e;
		var containerPoint = this._map.mouseEventToContainerPoint(first),
			layerPoint = this._map.mouseEventToLayerPoint(first),
			latlng = this._map.layerPointToLatLng(layerPoint);

		return {
			latlng: latlng,
			layerPoint: layerPoint,
			containerPoint: containerPoint,
			clientX: first.clientX,
			clientY: first.clientY,
			originalEvent: e
		};
	},
	_updateFinishHandler: function () {
		L.Draw.Polyline.prototype._updateFinishHandler.call(this);
		var distance, distancePixels,
			markerCount = this._markers.length,
			resolution = this._map.containerPointToLatLng([0, 0]).distanceTo(this._map.containerPointToLatLng([0, 1]));

		// It's not a line if it's not two points
		if (markerCount > 2) {
			/* 	The last marker should have a click handler to close the Polygon.
				When the user touches the screen I don't use the click event for the marker, this is because 
				we would need a relatively large marker to click on.
			 	Graphically this can look a bit crap. With this model we exffectively have a 
			 	click area of 24 pixels from the center of the marker no matter graphical marker size.
			 */
			distance = this._markers[markerCount - 2].getLatLng().distanceTo(this._markers[markerCount - 1].getLatLng());
			distancePixels = Math.floor(distance / resolution);
			if (distancePixels < 12 * (window.devicePixelRatio || 1)) {
				// Bit of a hack should refactor so updateFinishHandler is triggered before
				// addVertex.
				this.deleteLastVertex();
				this._finishShape();
			}
		}
	},
	_onTouchStart: function (e) {
		// Make sure it's a one fingure gesture and record the starting point
		if (e.touches.length === 1) {
			var normalisedEvent = this._normaliseEvent(e);
			this._currentLatLng = normalisedEvent.latlng;
			this._touchOriginPoint = L.point(normalisedEvent.clientX, normalisedEvent.clientY);
		}
	},

	_onTouchMove: function (e) {
		// Ensure we saved the starting point
		if (this._touchOriginPoint) {
			var normalisedEvent = this._normaliseEvent(e);
			this._touchEndPoint = L.point(normalisedEvent.clientX, normalisedEvent.clientY);
		}
	},

	_onTouchEnd: function () {
		// Make sure we have a starting point

		if (this._touchOriginPoint) {
			// If we have an end point we need to see how much it's moved before we decide if we save
			// If there is no _touchEndPoint we save straight away
			if (this._touchEndPoint) {
				// We detect clicks within a certain tolerance, otherwise let it
				// be interpreted as a drag by the map
				var distanceMoved = L.point(this._touchEndPoint).distanceTo(this._touchOriginPoint);
				if (Math.abs(distanceMoved) < 9 * (window.devicePixelRatio || 1)) {
					this.addVertex(this._currentLatLng);
				}
			} else {
				this.addVertex(this._currentLatLng);
			}
		}
		// No matter what remove the start and end point ready for the next touch.
		this._touchOriginPoint = null;
		this._touchEndPoint = null;
	}
});;L.Draw.Polygon = L.Draw.Polyline.extend({
	statics: {
		TYPE: 'polygon'
	},

	Poly: L.Polygon,

	options: {
		showArea: false,
		shapeOptions: {
			stroke: true,
			color: '#f06eaa',
			weight: 4,
			opacity: 0.5,
			fill: true,
			fillColor: null, //same as color by default
			fillOpacity: 0.2,
			clickable: true
		}
	},

	initialize: function (map, options) {
		L.Draw.Polyline.prototype.initialize.call(this, map, options);

		// Save the type so super can fire, need to do this as cannot do this.TYPE :(
		this.type = L.Draw.Polygon.TYPE;
	},

	_updateFinishHandler: function () {
		var markerCount = this._markers.length;


		// Add and update the double click handler
		if (markerCount > 3) {
			// The first marker should have a click handler to close the polygon
			this._markers[0].on('click', this._finishShape, this);
			this._markers[markerCount - 1].on('dblclick', this._finishShape, this);
			// Only need to remove handler if has been added before
			if (markerCount > 3) {
				this._markers[markerCount - 2].off('dblclick', this._finishShape, this);
			}
		}
	},

	_shapeIsValid: function () {
		return this._markers.length >= 3;
	},

	_vertexChanged: function (latlng, added) {
		var latLngs;

		// Check to see if we should show the area
		if (!this.options.allowIntersection && this.options.showArea) {
			latLngs = this._poly.getLatLngs();

			this._area = L.GeometryUtil.geodesicArea(latLngs);
		}

		L.Draw.Polyline.prototype._vertexChanged.call(this, latlng, added);
	},

	_cleanUpShape: function () {
		var markerCount = this._markers.length;

		if (markerCount > 0) {
			this._markers[0].off('click', this._finishShape, this);

			if (markerCount > 2) {
				this._markers[markerCount - 1].off('dblclick', this._finishShape, this);
			}
		}
	}
});;L.Draw.PolygonTouch = L.Draw.Polygon.extend({
	initialize: function (map, options) {
		L.Draw.Polygon.prototype.initialize.call(this, map, options);
	},
	addHooks: function () {
		L.Draw.Polygon.prototype.addHooks.call(this);
		L.DomEvent.addListener(this._map._container, 'touchstart', this._onTouchStart, this);
		L.DomEvent.addListener(this._map._container, 'touchmove', this._onTouchMove, this);
		L.DomEvent.addListener(this._map._container, 'touchend', this._onTouchEnd, this);
	},
	removeHooks: function () {
		L.Draw.Polygon.prototype.removeHooks.call(this);
		if (this._map) {
			L.DomEvent.removeListener(this._map._container, 'touchstart', this._onTouchStart, this);
			L.DomEvent.removeListener(this._map._container, 'touchmove', this._onTouchMove, this);
			L.DomEvent.addListener(this._map._container, 'touchend', this._onTouchEnd, this);
		}
	},
	_normaliseEvent: function (e) {
		L.DomUtil.disableImageDrag();
		L.DomUtil.disableTextSelection();

		var first = e.touches ? e.touches[0] : e;
		var containerPoint = this._map.mouseEventToContainerPoint(first),
			layerPoint = this._map.mouseEventToLayerPoint(first),
			latlng = this._map.layerPointToLatLng(layerPoint);

		return {
			latlng: latlng,
			layerPoint: layerPoint,
			containerPoint: containerPoint,
			clientX: first.clientX,
			clientY: first.clientY,
			originalEvent: e
		};
	},

	_updateFinishHandler: function () {
		L.Draw.Polygon.prototype._updateFinishHandler.call(this);
		var distance, distancePixels,
			markerCount = this._markers.length,
			resolution = this._map.containerPointToLatLng([0, 0]).distanceTo(this._map.containerPointToLatLng([0, 1]));

		// It's not really a polygon if it's less than four points (If start and end points are the same).
		// So we won't even try and close it until it is valid.
		if (markerCount > 3) {
			/* 	If you click the first marker you close the Polygon.
				When the user touches the screen I don 't use the click event for the marker, this is because 
				we would need a relatively large marker to click on.
			 	Graphically this can look a bit crap. With this model we exffectively have a 
			 	click area of 24 pixels from the center of the marker no matter graphical marker size.
			 */
			distance = this._markers[0].getLatLng().distanceTo(this._markers[markerCount - 1].getLatLng());
			distancePixels = Math.floor(distance / resolution);
			if (distancePixels < 12 * (window.devicePixelRatio || 1)) {
				// Bit of a hack should refactor so updateFinishHandler is triggered before
				// addVertex.
				this.deleteLastVertex();
				this._finishShape();
			}
		}
	},
	_onTouchStart: function (e) {
		// Make sure it's a one fingure gesture and record the starting point
		if (e.touches.length === 1) {
			var normalisedEvent = this._normaliseEvent(e);
			this._currentLatLng = normalisedEvent.latlng;
			this._touchOriginPoint = L.point(normalisedEvent.clientX, normalisedEvent.clientY);
		}
	},

	_onTouchMove: function (e) {
		// Ensure we saved the starting point
		if (this._touchOriginPoint) {
			var normalisedEvent = this._normaliseEvent(e);
			this._touchEndPoint = L.point(normalisedEvent.clientX, normalisedEvent.clientY);
		}
	},

	_onTouchEnd: function () {
		// Make sure we have a starting point

		if (this._touchOriginPoint) {
			// If we have an end point we need to see how much it's moved before we decide if we save
			// If there is no _touchEndPoint we save straight away
			if (this._touchEndPoint) {
				// We detect clicks within a certain tolerance, otherwise let it
				// be interpreted as a drag by the map
				var distanceMoved = L.point(this._touchEndPoint).distanceTo(this._touchOriginPoint);
				if (Math.abs(distanceMoved) < 9 * (window.devicePixelRatio || 1)) {
					this.addVertex(this._currentLatLng);
				}
			} else {
				this.addVertex(this._currentLatLng);
			}
		}
		// No matter what remove the start and end point ready for the next touch.
		this._touchOriginPoint = null;
		this._touchEndPoint = null;
	}
});