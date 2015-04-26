util = {

	softIndexOf: function (value, array, equality) {
		for (var i = 0; i < array.length; i ++) {
			if (equality(value, array[i])) {
				return i
			}
		}
		return -1
	},

	shuffleArray: function(array) {
		var currentIndex = array.length, temporaryValue, randomIndex ;

		// While there remain elements to shuffle...
		while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	},

	parseNumberList: function(s) {
		var parts = s.split(",");
		var ret = []
		parts.forEach(function (x) {
			var p = parseInt(x);
			if (!isNaN(p)) ret.push(p);
		});
		return ret;
	}

}