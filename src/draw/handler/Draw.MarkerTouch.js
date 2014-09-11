/*
	A simpler implementation works by mimicking the click event but I had problems overlaying over objects with popups. One of the reasons the mouse version uses a marker.
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
			this._latlng = normalisedEvent.latlng;
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
			// If we have an en point we need to see how much it's moved before we decide if we save
			// If there is no _touchEndPoint we save straight away
			if (this._touchEndPoint) {
				// We detect clicks within a certain tolerance, otherwise let it
				// be interpreted as a drag by the map
				var distanceMoved = L.point(this._touchEndPoint).distanceTo(this._touchOriginPoint);
				if (Math.abs(distanceMoved) < 9 * (window.devicePixelRatio || 1)) {
					this._fireTouchCreatedEvent();
				}
			} else {
				this._fireTouchCreatedEvent();
			}
		}
		// No matter what remove the start and en point ready for the next touch.
		delete this._touchOriginPoint;
		delete this._latlng;
		delete this._touchEndPoint;
	},
	_fireTouchCreatedEvent: function () {
		var marker = new L.Marker(this._latlng, {
			icon: this.options.icon
		});
		L.Draw.Feature.prototype._fireCreatedEvent.call(this, marker);
		this.disable();
		if (this.options.repeatMode) {
			this.enable();
		}
	}
});