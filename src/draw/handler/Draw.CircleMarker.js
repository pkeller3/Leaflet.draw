L.Draw.CircleMarker = L.Draw.SimpleShape.extend({
    statics: {
        TYPE: 'circleMarker'
    },

    options: {
        shapeOptions: {
            stroke: true,
            color: '#0033ff',
            weight: 4,
            opacity: 0.5,
            fill: true,
            fillColor: null, //same as color by default
            fillOpacity: 0.2,
            clickable: true
        },
        radius: 10,
        showRadius: true,
        metric: true // Whether to use the metric meaurement system or imperial
    },

    initialize: function (map, options) {
        // Save the type so super can fire, need to do this as cannot do this.TYPE :(
        this.type = L.Draw.CircleMarker.TYPE;

        this._initialLabelText = L.drawLocal.draw.handlers.circleMarker.tooltip.start;

        L.Draw.SimpleShape.prototype.initialize.call(this, map, options);
    },

    addHooks: function () {
        L.Draw.Feature.prototype.addHooks.call(this);

        if (this._map) {
            this._tooltip.updateContent({ text: L.drawLocal.draw.handlers.marker.tooltip.start });

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
            if (this._circleMarker) {
                this._circleMarker.off('click', this._onClick, this);
                this._map
					.off('click', this._onClick, this)
					.removeLayer(this._circleMarker);
                delete this._circleMarker;
            }

            this._mouseMarker.off('click', this._onClick, this);
            this._map.removeLayer(this._mouseMarker);
            delete this._mouseMarker;

            this._map.off('mousemove', this._onMouseMove, this);
        }
    },

    _onMouseMove: function (e) {
        var latlng = e.latlng;

        this._tooltip.updatePosition(latlng);
        this._mouseMarker.setLatLng(latlng);

        if (!this._circleMarker) {
            this._circleMarker = new L.CircleMarker(latlng, this.options.shapeOptions);
            // Bind to both marker and map to make sure we get the click event.
            this._circleMarker.on('click', this._onClick, this);
            this._map
				.on('click', this._onClick, this)
				.addLayer(this._circleMarker);
        }
        else {
            latlng = this._mouseMarker.getLatLng();
            this._circleMarker.setLatLng(latlng);
        }
    },

    _onClick: function () {
        this._fireCreatedEvent();
        this.disable();
    },

    _fireCreatedEvent: function () {
        var circleMarker = new L.CircleMarker(this._circleMarker.getLatLng(), this.options.shapeOptions);
        L.Draw.Feature.prototype._fireCreatedEvent.call(this, circleMarker);
    }
});