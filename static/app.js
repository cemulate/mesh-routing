var simStep = 0;

var POINT_TO_POINT_DISTANCE = 250;

function getSimTime() {
	return simStep;
}

function Frame(content) {
	this.content = content;
	this.source = 0;
	this.dest = 0;
	this.needsAck = false;
	this.ACK = false;
	this.broadcast = false;
}


function DataLinkLayer(nodeId) {
	this.nodeId = nodeId;
	this.frameTXQueue = [];
	this.frameRXQueue = [];
	this.ackRXFlag = 0;
}

DataLinkLayer.prototype.simulateGotFrame = function(f) {

	if (f.ACK) {
		this.ackRXFlag = f.source;
		return;
	}

	this.frameRXQueue.push(f);

}

DataLinkLayer.prototype.sendFrame = function(dest, framePayload) {
	var f = new Frame(framePayload);
	f.source = this.nodeId;
	f.dest = dest;
	f.needsAck = true;
	f.ACK = false;
	f.broadcast = false;
	this.frameTXQueue.push(f);
}

DataLinkLayer.prototype.broadcastFrame = function(framePayload) {
	var f = new Frame(framePayload);
	f.source = this.nodeId;
	f.needsAck = false;
	f.ACK = false;
	f.broadcast = true;
	this.frameTXQueue.push(f);
}

DataLinkLayer.prototype.framesToRead = function () {
	return (this.frameRXQueue.length > 0);
}

DataLinkLayer.prototype.getNextFrame = function () {
	return this.frameRXQueue.pop();
}

DataLinkLayer.prototype.sendAck = function(dest) {
	var f = new Frame("");
	f.source = this.nodeId;
	f.dest = dest;
	f.needsAck = false;
	f.ACK = true;
	f.broadcast = false;
	this.frameTXQueue.push(f);
}

DataLinkLayer.prototype.ackReceived = function(source) {
	if (this.ackRXFlag > 0) {
		var temp = this.ackRXFlag;
		this.ackRXFlag = 0;
		return temp;
	} else {
		return 0;
	}
}


function Packet(content, source, dest, type) {
	this.source = source;
	this.dest = dest;
	this.type = type;
	this.content = content;

	// Only RRQ/RUP
	this.rrqID = 0;
	this.hopcount = 0;
}

Packet.prototype.copy = function() {
	p = new Packet(this.content, this.source, this.dest, this.type);
	p.rrqID = this.rrqID;
	p.hopcount = this.hopcount;
	return p;
}

function RRQProgress() {
	this.dest = 0;
	this.timestamp = 0;
	this.active = false;
	this.resolved = false;
	this.timeout = false;
}

function RoutingTableEntry(nextHop, originalRRQID) {
	this.nextHop = nextHop;
	this.failures = 0;
	this.originalRRQID = originalRRQID;
}

RoutingTableEntry.prototype.isValid = function() {
	return (this.nextHop != 0) && (this.failures < 10);
}

RoutingTableEntry.prototype.invalidate = function() {
	this.nextHop = 0;
	this.failures = 0;
}

function Node(container, position, id) {

	this.nodeId = id;
	this.txQueue = [];
	this.rxQueue = [];
	this.frameRXQueue = [];

	this.rrqProgress = new RRQProgress();
	this.recentRRQ = [];

	this.routingTable = {};

	this.DLL = new DataLinkLayer(this.nodeId);


	this.position = position;

	this.container = container;

	this.visual = new paper.Group();
	this.populateVisual();

	this.container.addChild(this.visual);

}

// Graphics functions

Node.prototype.populateVisual = function() {
	this.core = new paper.Shape.Circle({
		center: new paper.Point(this.position.x, this.position.y),
		radius: 10,
		strokeColor: '#777',
		fillColor: '#777'
	});

	this.redAura = new paper.Shape.Circle({
		center: new paper.Point(this.position.x, this.position.y),
		radius: POINT_TO_POINT_DISTANCE/2,
		strokeWidth: 0.0,
		fillColor: Please.make_color({base_color: '#ff2b00', range:10, value:0.9}),
		opacity: 0.0
	});

	this.blueAura = new paper.Shape.Circle({
		center: new paper.Point(this.position.x, this.position.y),
		radius: POINT_TO_POINT_DISTANCE/2,
		strokeWidth: 0.0,
		fillColor: Please.make_color({base_color: '#00c4ff', range:15}),
		opacity: 0.0
	});

	this.grayAura = new paper.Shape.Circle({
		center: new paper.Point(this.position.x, this.position.y),
		radius: POINT_TO_POINT_DISTANCE/2,
		strokeWidth: 0.0,
		//fillColor: Please.make_color({base_color: 'green', range:30, value:0.8}),
		fillColor: Please.make_color({golden:false, base_color:'white', saturation:0.2, range:360}),
		opacity: 0.0
	});

	this.visual.addChild(this.redAura);
	this.visual.addChild(this.core);

}

Node.prototype.teardownVisual = function() {
	this.visual.remove();
}

Node.prototype.redAuraVisible = function() {
	return (this.redAura.opacity > 0.0);
}

Node.prototype.showRedAura = function () {
	this.redAura.opacity = 0.0;

	this.redAura.fillColor = Please.make_color({base_color: '#ff2b00', range:10, value:0.9});

	Tweens.linear({
		target:this.redAura,
		prop:'opacity',
		stop:0.8,
		length:750
	}).next(Tweens.linear({
		target:this.redAura,
		prop:'opacity',
		start:0.8,
		stop:0,
		length:1000
	})).start();
}

Node.prototype.showGrayAura = function() {

	this.grayAura.opacity = 0.0;

	this.grayAura.fillColor = Please.make_color({golden:false, base_color:'white', saturation:0.2, range:360});

	Tweens.linear({
		target:this.grayAura,
		prop:'opacity',
		stop:0.9,
		length:1000
	}).next(Tweens.linear({
		target:this.grayAura,
		prop:'opacity',
		start:0.9,
		stop:0,
		length:1000
	})).start();
}

Node.prototype.decreaseRedAuraOpacityBy = function (x) {
	var n = this.redAura.opacity - x;
	this.redAura.opacity = (n > 0.0) ? n : 0.0;
}

Node.prototype.blueAuraVisible = function() {
	return (this.blueAura.opacity > 0.0);
}

Node.prototype.showBlueAura = function () {
	this.blueAura.opacity = 0.0;

	this.blueAura.fillColor = Please.make_color({base_color: '#00c4ff', range:15});

	Tweens.linear({
		target:this.blueAura,
		prop:'opacity',
		stop:0.8,
		length:500
	}).next(Tweens.linear({
		target:this.blueAura,
		prop:'opacity',
		start:0.8,
		stop:0,
		length:500
	})).start();
}

Node.prototype.decreaseBlueAuraOpacityBy = function (x) {
	var n = this.blueAura.opacity - x;
	this.blueAura.opacity = (n > 0.0) ? n : 0.0;
}

Node.prototype.distanceTo = function (n) {
	var dx = (n.position.x - this.position.x);
	var dy = (n.position.y - this.position.y);

	return Math.sqrt(dx*dx + dy*dy);
}


// Logic functions

Node.prototype.getNextHop = function(dest) {
	var r = this.routingTable[dest];
	if (r != null && r.isValid()) {
		return r;
	}

	if (r != null) r.invalidate();
	return null;
}

Node.prototype.routeExistsTo = function(dest) {

	if (this.rrqProgress.active) {
		since = getSimTime() - this.rrqProgress.timestamp;
		if (this.rrqProgress.resolved || (since >= 20)) {
			this.rrqProgress.active = false;
		}
	}

	return (this.getNextHop(dest) != null) && (this.rrqProgress.dest != dest || !this.rrqProgress.active);

}

// Node.prototype.forward = function(rtEntry, framePayload) {

// 	var acked = false;
// 	var retries = 0;

// 	while (retries < 5) {

// 		var sendTime = getSimTime();
// 		this.DLL.sendFrame(rtEntry.nextHop, framePayload);

// 		while ((getSimTime() - sendTime) < 5) {
// 			acked = this.DLL.ackReceived(rtEntry.nextHop);
// 			if (acked) {
// 				break;
// 			}
// 		}

// 		if (acked) {
// 			rtEntry.failures = 0;
// 			return true;
// 		}
// 		rtEntry.failures += 1;
// 		retries += 1;

// 	}

// 	return false;

// }

// "Faithful" implementation has to be changed to work in javascript:
// On the microcontroller, this function "blocks" until it receives an ACK
// But the thread can still be interrupted so other processes (like the ACK arriving)
// happen smoothly. But in javascript, we can't just busy-wait / block because
// the simulation thread running everything won't ever get a turn, and we lock up
// the browser. So this function has to be heavily modified for the purposes
// of this simulation

Node.prototype.forward = function(rtEntry, framePayload) {
	this._sendTime = getSimTime();
	this._ackWaitRTEntry = rtEntry;
	this.DLL.sendFrame(rtEntry.nextHop, framePayload);
	return true;
}

Node.prototype._checkAck = function() {
	if (this.DLL.ackReceived(this._ackWaitRTEntry.nextHop)) {
		this._blockedWaitingForAck = false;
	} else {
		if (getSimTime() - this._sendTime > 5) {
			this._ackWaitRTEntry.failures += 1;
		}
	}
}

Node.prototype.logRecentRRQ = function(rrqID) {
	this.recentRRQ.push(rrqID);
}

Node.prototype.initiateRouteRequest = function(dest) {

	this.rrqProgress.dest = dest;
	this.rrqProgress.resolved = false;
	this.rrqProgress.timestamp = getSimTime();
	this.rrqProgress.active = true;

	var p = new Packet([], this.nodeId, dest, "PACKET_TYPE_RRQ");
	p.rrqID = Date.now();
	p.hopcount = 0;

	this.logRecentRRQ(p.rrqID);

	this.DLL.broadcastFrame(p);

}

Node.prototype.didRecentlyForwardRRQ = function(rrqID) {
	var i = 0;
	for (i = 0; i < this.recentRRQ.length; i ++) {
		if (this.recentRRQ[i] == rrqID) return true;
	}
	return false;
}

Node.prototype.sendPacket = function(p) {

	nextHopEntry = this.getNextHop(p.dest);

	if (nextHopEntry != null) {
		return this.forward(nextHopEntry, p);
	} else {
		return false;
	}

}

// ------------ Top level exposed routing functions ------------

Node.prototype.queuePacket = function (p) {
	this.txQueue.push(p);
}

Node.prototype.processSendQueue = function () {
	
	while (this.txQueue.length > 0) {
		
		var p = this.txQueue.pop();

		if (this.routeExistsTo(p.dest)) {

			this.sendPacket(p);

		} else if (!this.rrqProgress.active) {

			this.initiateRouteRequest(p.dest);

		}

	}

}

Node.prototype.handleReceived = function () {

	var np;
	var frame;
	var senderNodeId;
	var p, r;

	while (this.DLL.framesToRead()) {

		frame = this.DLL.getNextFrame();

		senderNodeId = frame.source;
		
		if (frame.needsAck) {
			this.DLL.sendAck(senderNodeId);
		}

		p = frame.content;

		if (p.type == "PACKET_TYPE_RRQ") {

			if (!this.didRecentlyForwardRRQ(p.rrqID)) {

				if (p.dest == this.nodeId) {

					r = new RoutingTableEntry();
					r.nextHop = senderNodeId;
					r.failures = 0;
					r.originalRRQID = p.rrqID;
					this.routingTable[p.source] = r;

					// np = p.copy();

					// np.source = p.dest;
					// np.dest = p.source;
					// np.type = "PACKET_TYPE_RUP";

					var temp = p.source;
					p.source = p.dest;
					p.dest = temp;
					p.type = "PACKET_TYPE_RUP";

					this.forward(r, p);
					

				} else {

					nodeList = p.content;
					nodeList.push(this.nodeId);

					p.hopcount += 1;

					this.DLL.broadcastFrame(p);

				}

			}

			// !!
			this.recentRRQ.push(p.rrqID);

		} else if (p.type == "PACKET_TYPE_RUP") {

			if ((p.dest == this.nodeId) && (this.rrqProgress.dest == p.source)) {

				r = this.routingTable[this.rrqProgress.dest];
				if (r == null) {
					r = new RoutingTableEntry();
					this.routingTable[this.rrqProgress.dest] = r;
				}

				this.routingTable[this.rrqProgress.dest].nextHop = senderNodeId;
				this.routingTable[this.rrqProgress.dest].originalRRQID = p.rrqID;

				this.rrqProgress.resolved = true;

				this.queuePacket(new Packet("Hey", this.nodeId, p.source, "PACKET_TYPE_CONTENT"));

			} else {

				var r_source = new RoutingTableEntry();
				r_source.nextHop = senderNodeId;
				r_source.failures = 0;
				r_source.originalRRQID = p.rrqID;
				this.routingTable[p.source] = r_source;

				var nodeStack = p.content;

				var lastNode;

				if (p.hopcount >= 2) {
					lastNode = nodeStack[p.hopcount - 2];
				} else {
					lastNode = p.dest;
				}

				var r_dest = new RoutingTableEntry();
				r_dest.nextHop = lastNode;
				r_dest.failures = 0;
				r_dest.originalRRQID = p.rrqID;
				this.routingTable[p.dest] = r_dest;

				p.hopcount -= 1;

				this.forward(r_dest, p);

			}

		} else if (p.type == "PACKET_TYPE_FAIL") {

			this.routingTable[p.source].nextHop = 0;

		} else {

			if (p.dest == this.nodeId) {
				this.rxQueue.push(p);
				return;
			}

			nextHopEntry = this.getNextHop(p.dest);

			if (nextHopEntry != null) {
				this.forward(nextHopEntry, p);
			} else {
				// np = p.copy();
				// np.type = "PACKET_TYPE_FAIL";
				// np.dest = p.source;
				// np.source = p.dest;

				var temp = p.source;
				p.source = p.dest;
				p.dest = temp;
				p.type = "PACKET_TYPE_FAIL";

				var nextHopEntry = this.getNextHop(np.dest);

				if (nextHopEntry != null) {
					this.forward(nextHopEntry, p);
				} else {
					// You're screwed.
				}

			}

		}

	}

}

// -------------------------------------------------------------


var runningNodeId = 0;

function Simulation(real_width, real_height) {

	this.coords = new CoordinateSystem(real_width, real_height);
	this.coords.autoSetFromWidth(10000);

	this.mainLayer = new paper.Layer();
	this.mainLayer.transformContent = false;
	this.mainLayer.matrix.initialize(this.coords.matrix);

	this.cplane = new paper.Group();
	//this.coords.drawCoordinatePlane(this.cplane, {});

	this.nodeGroup = new paper.Group();

	this.nodes = [];

	// var i, j;
	// var k = 1;
	// for (i = -2000; i <= 2000; i += 200) {
	// 	for (j = -1000; j <= 1000; j += 200) {

	// 		if (Math.random() < 0.65) {
	// 			this.nodes.push(new Node(this.nodeGroup, {x: i, y: j}, k));
	// 			k += 1;
	// 		}
			
	// 	}
	// }

	var self = this;
	paper.view.onFrame = function (event) {
		//self.animation(event.time, event.delta);

		Tweens.step(event.time, event.delta);
	}

	this.eventTimerId = setInterval(function () {
		self.eventTimer();
	}, 50);

	this.tool = new paper.Tool();

	this.send1 = null;
	this.send2 = null;

	this.tool.onMouseDown = function(event) {
		var p = self.coords.inverseTransform(event.downPoint);
		var b = event.event.button;
		self.clickHandler(p, b);
	}

	this.randomNetwork();

	this.generateMessages();

	// A = this.nodes[0];
	// B = this.nodes[this.nodes.length - 1];

}

function random_int( min, max ){
	var random = Math.random;
	return Math.floor( random() * ( max - min + 1 )) + min;
}

function random_float( min, max ){
	var random = Math.random;
	return random() * ( max - min ) + min;
}

Simulation.prototype.generateMessages = function() {

	function hookUp() {
		// pick two random ids

		var limit = this.nodes.length - 1;

		var nodeOne = this.nodes[random_int(0, limit)];

		var nodeTwo = this.nodes[random_int(0, limit)];

		nodeOne.queuePacket(new Packet("Hey", nodeOne.nodeId, nodeTwo.nodeId, "PACKET_TYPE_CONTENT"));

		//window.setInterval(hookUp.bind(this), 4000);
	}

	hookUp.bind(this)();

	window.setInterval(hookUp.bind(this), 7000);

}

Simulation.prototype.randomNetwork = function() {

	var lastPoint = {x:0, y:0};

	var start_angle = 0.0;

	function random_point(start) {
		var angle = start_angle + random_float(-0.4*Math.PI, 0.4*Math.PI);

		var distance = random_int(POINT_TO_POINT_DISTANCE - 50, POINT_TO_POINT_DISTANCE - 1);

		start_angle = angle;

		return {x: start.x + distance*Math.cos(angle), y: start.y + distance*Math.sin(angle)};
	}

	for (var i = 0; i < 1250; ++i) {
		var p = random_point(lastPoint);

		while ((Math.abs(p.x) > this.coords.maxx) || (Math.abs(p.y) > this.coords.maxy)) {
			start_angle += 0.1 * Math.PI;
			p = random_point(lastPoint);
		}

		this.nodes.push(new Node(this.nodeGroup, p, runningNodeId));
		runningNodeId += 1;

		lastPoint = p;
	}

	this.nodeTree = new Quadtree({
		x: this.coords.minx, y: this.coords.miny,
		width: this.coords.maxx - this.coords.minx,
		height: this.coords.maxy - this.coords.miny
	}, 2, 10);

	this.nodes.forEach(function (n) {
		this.nodeTree.insert({
			x: n.position.x - POINT_TO_POINT_DISTANCE/2,
			y: n.position.y - POINT_TO_POINT_DISTANCE/2,
			width: POINT_TO_POINT_DISTANCE,
			height: POINT_TO_POINT_DISTANCE,
			node: n
		});
	}, this);
}

Simulation.prototype.clickHandler = function(p, b) {
	
	var hit = 0;

	if (b == 0) {
		this.nodes.push(new Node(this.nodeGroup, {x: p.x, y: p.y}, runningNodeId));
		runningNodeId += 1;
	} else if (b == 1) {
		hit = this.nodeHitTest(p);
		if (hit > -1) {
			this.nodes[hit].teardownVisual();
			this.nodes.splice(hit, 1);
		}
	} else if (b == 2) {
		hit = this.nodeHitTest(p);
		console.log(this.nodes[hit]);
		if (this.send1 == null) {
			this.send1 = this.nodes[hit];
		} else if (this.send2 == null) {
			this.send2 = this.nodes[hit];
			if (this.send1 !== null && this.send2 !== null) {
				this.send1.queuePacket(new Packet("Hey", this.send1.nodeId, this.send2.nodeId, "PACKET_TYPE_CONTENT"));
			}
			this.send1 = null;
			this.send2 = null;
		}
	}
}

Simulation.prototype.nodeHitTest = function(p) {
	var i = 0;
	for (i = 0; i < this.nodes.length; i ++) {
		if (this.nodes[i].core.contains(p)) {
			return i;
		}
	}
	return -1;
}

Simulation.prototype.eventTimer = function() {

	var nodeList = this.nodes;

	var sim = this;

	nodeList.map(function (n) {
		
		// Part of the ugly ACK hack. The simulation 
		// won't allow n to "progress" or "do things"
		// if its "blocking" waiting for an ACK.
		if (n._blockedWaitingForAck) return;

		if (n.DLL.frameTXQueue.length == 0) return;

		/*
		var closeNodes = nodeList.filter(function(k) {
			var xh = Math.abs(k.position.x - n.position.x);

			var yh = Math.abs(k.position.y - n.position.y);

			return (xh <= POINT_TO_POINT_DISTANCE) && (yh <= POINT_TO_POINT_DISTANCE);
		});
		*/

		var closeNodes = this.nodeTree.retrieve({
			x: n.position.x - POINT_TO_POINT_DISTANCE/2,
			y: n.position.y - POINT_TO_POINT_DISTANCE/2,
			width: POINT_TO_POINT_DISTANCE,
			height: POINT_TO_POINT_DISTANCE,
		}).map(function(n){return n.node});


		while (n.DLL.frameTXQueue.length > 0) {

			sf = n.DLL.frameTXQueue.pop();

			closeNodes.map(function (k) {
				if (n == k) return;

				if (sf.broadcast || (sf.dest == k.nodeId)) {

					if (n.distanceTo(k) < POINT_TO_POINT_DISTANCE) {

						//console.log("Channel carrying frame from " + n.nodeId + " to " + k.nodeId + " with content: ");
						//console.log(sf);
						k.DLL.simulateGotFrame(JSON.parse(JSON.stringify(sf)));

						sim.handleFrameSendGraphics(n, k, sf);

						// If n sent a frame that needs an ACK,
						// THEN set it as "blocked" waiting for the ACK
						n._blockedWaitingForAck = sf.needsAck;

					}

				}
			});
		}
	}, this);

	nodeList.map(function (n) {

		// Part of the ugly ACK hack. The simulation 
		// won't allow n to "progress" or "do things"
		// if its "blocking" waiting for an ACK.
		if (!n._blockedWaitingForAck) {
			n.processSendQueue();
			n.handleReceived();
		} else {
			n._checkAck();
		}

	});

	simStep += 1;
	//console.log("Simulation time: " + simStep);

}

Simulation.prototype.handleFrameSendGraphics = function(source, dest, frame) {

	if (frame.content instanceof Object) {
		if (frame.content.type == "PACKET_TYPE_RRQ") {
			source.showRedAura();
		} else if (frame.content.type == "PACKET_TYPE_RUP") {
			source.showBlueAura();
		} else if (frame.content.type == "PACKET_TYPE_CONTENT") {
			source.showGrayAura();
		}
	}

}

Simulation.prototype.animation = function(time, dt) {

	this.nodes.map(function (n) {
		//if (n.redAuraVisible()) n.decreaseRedAuraOpacityBy(1.0 * dt);
		//if (n.blueAuraVisible()) n.decreaseBlueAuraOpacityBy(1.0 * dt);
	});

}

var Tweens = {};

Tweens.list = [];

Tweens.step = function(time, delta) {

	for(var i = 0; i < Tweens.list.length; ++i) {

		var t = Tweens.list[i];

		if (t === null || t === undefined) {
			Tweens.list.splice(i, 1);
			--i;
		}
	}

	var temp = [];

	for(var i = 0; i < Tweens.list.length; ++i) {
		var tween = Tweens.list[i].step(time, delta);

		if (tween === null) {
			tween = null;
		} else {
			tween = tween;
		}

		if (tween !== null)
			temp.push(tween);
	}

	Tweens.list = temp;

}

// Linear Tween function
var Linear = function(options) {

	var options = options || {};

	if (!options.target) {
		throw new Error("Tweens must have a target");
	}

	this.target = options.target;

	this.prop = options.prop || null;

	this.length = options.length || 1;

	this.stop = options.stop;

	if (options.start)
		this._start = options.start;
	else {
		this._start = this.target[this.prop];
	}

	this.slope = ( this.stop - this._start ) / this.length;

	this._nextTween = null;

}

Linear.prototype.start = function() {
	Tweens.list.push(this);

	return this;
}

Linear.prototype.next = function(tween) {
	this._nextTween = tween;

	return this;
}

Linear.prototype.step = function linearStep(time, delta) {

	var prev = this.target[this.prop];

	var nextVal = prev + this.slope*delta*1000;

	if (this._start <= this.stop && nextVal >= this.stop) { // we have exceeded or equaled stop
		this.target[this.prop] = this.stop;

		return this._nextTween;
	}

	if (this._start >= this.stop && nextVal <= this.stop) {
		this.target[this.prop] = this.stop;
		return this._nextTween;
	}

	this.target[this.prop] = nextVal;

	return this;

}

Tweens.linear = function(options) {
	return new Linear(options);
};


