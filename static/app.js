function Packet(content, from, to) {
	this.content = content;
	this.from = from;
	this.to = to;
}

Packet.prototype.copy = function() {
	return new Packet(this.content, this.from, this.to);
}

function Node(container, position, id) {

	this.position = position;
	this.id = id;

	this.outbox = null;
	this.waitingToSend = false;

	this.rxPacketQueue = [];


	this.container = container;

	this.visual = new paper.Group();
	this.populateVisual();

	this.container.addChild(this.visual);

}

// Graphics functions

Node.prototype.populateVisual = function() {
	this.core = new paper.Shape.Circle({
		center: new paper.Point(this.position.x, this.position.y),
		radius: 0.5,
		strokeColor: 'black',
		strokeScaling: false,
		fillColor: 'black'
	});

	this.aura = new paper.Shape.Circle({
		center: new paper.Point(this.position.x, this.position.y),
		radius: 5.0,
		strokeWidth: 0.0,
		fillColor: 'red',
		opacity: 0.0
	});

	this.visual.addChild(this.aura);
	this.visual.addChild(this.core);

}

Node.prototype.auraVisible = function() {
	return (this.aura.opacity > 0.0);
}

Node.prototype.showAura = function () {
	this.aura.opacity = 1.0;
}

Node.prototype.decreaseAuraOpacityBy = function (x) {
	var n = this.aura.opacity - x;
	this.aura.opacity = (n > 0.0) ? n : 0.0;
}

Node.prototype.distanceTo = function (n) {
	var dx = (n.position.x - this.position.x);
	var dy = (n.position.y - this.position.y);

	return Math.sqrt(dx*dx + dy*dy);
}


// Logic functions

Node.prototype.sendMessage = function(content, destination) {
	this.outbox = new Packet(content, this.id, destination);
}

Node.prototype.clearMessage = function () {
	this.outbox = null;
	this.waitingToSend = false;
}

Node.prototype.gotPacket = function(p) {

	this.rxPacketQueue.push(p);

}

Node.prototype.rout = function () {

	// Simplest possible:

	if (this.rxPacketQueue.length > 0) {
		this.outbox = this.rxPacketQueue.shift();
	}

}


function Simulation(real_width, real_height) {

	this.coords = new CoordinateSystem(real_width, real_height);
	this.coords.autoSetFromWidth(100);

	this.mainLayer = new paper.Layer();
	this.mainLayer.transformContent = false;
	this.mainLayer.matrix.initialize(this.coords.matrix);

	this.cplane = new paper.Group();
	this.coords.drawCoordinatePlane(this.cplane, {});

	this.nodeGroup = new paper.Group();

	this.nodes = [];

	this.nodes.push(new Node(this.nodeGroup, {x: -40, y: 5}, 0));
	this.nodes.push(new Node(this.nodeGroup, {x: -32, y: 5}, 1));
	this.nodes.push(new Node(this.nodeGroup, {x: -24, y: 5}, 2));
	this.nodes.push(new Node(this.nodeGroup, {x: -16, y: 5}, 3));


	var self = this;
	paper.view.onFrame = function (event) {
		self.animation(event.time, event.delta);
	}

	this.eventTimerId = setInterval(function () {
		self.eventTimer();
	}, 1000);

	this.nodes[0].sendMessage("hey", 4);

}

Simulation.prototype.eventTimer = function() {

	var nodeList = this.nodes;

	nodeList.map(function (n) {
		if (n.waitingToSend) {
			nodeList.map(function (k) {
				if (k == n) return;
				if (n.distanceTo(k) < 10) {
					k.gotPacket(n.outbox.copy());
				}
			});
			n.showAura();
			n.clearMessage();
		}
	});

	nodeList.map(function (n) {

		n.rout();

		if (n.outbox != null) {
			n.waitingToSend = true;
		}
	});

}

Simulation.prototype.animation = function(time, dt) {
	
	this.nodes.map(function (n) {
		if (n.auraVisible()) n.decreaseAuraOpacityBy(1.0 * dt);
	});

}

