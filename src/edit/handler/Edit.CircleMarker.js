L.Edit = L.Edit || {};

L.Edit.CircleMarker = L.Edit.Circle.extend({
    _initMarkers: function () {
        if (!this._markerGroup) {
            this._markerGroup = new L.LayerGroup();
        }

        // Create center marker
        this._createMoveMarker();
    },

    _move: function (latlng) {
        // Move the circle
        this._shape.setLatLng(latlng);
    }
});

L.CircleMarker.addInitHook(function () {
    if (L.Edit.CircleMarker) {
        this.editing = new L.Edit.CircleMarker(this);

        if (this.options.editable) {
            this.editing.enable();
        }
    }

    this.on('add', function () {
        if (this.editing && this.editing.enabled()) {
            this.editing.addHooks();
        }
    });

    this.on('remove', function () {
        if (this.editing && this.editing.enabled()) {
            this.editing.removeHooks();
        }
    });
});