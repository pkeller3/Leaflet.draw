L.Draw.PolylineTouch = L.Draw.Polyline.extend({
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
			resolution = map.containerPointToLatLng([0, 0]).distanceTo(map.containerPointToLatLng([0, 1]));

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

	_onTouchEnd: function (e) {
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