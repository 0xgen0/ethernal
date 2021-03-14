export default class Draw {
  constructor(canvas, map, config = {
    showExplorers: false,
    corridors: true,
    expansions: true,
    coloredRooms: false,
    showGrid: false
  }) {
    this.canvas = canvas;
    this.map = map;
    this.roomSize = 60;
    this.corridorWidth = 15;
    this.roomMargin = 1;
    this.coloredRooms = config.coloredRooms;
    this.showExplorers = config.showExplorers;
    this.corridors = config.corridors;
    this.expansions = config.expansions;
    this.showGrid = config.showGrid;
    this.camera = {
      x: 0,
      y: 0,
    };
  }

  init() {
    this.ctx = this.canvas.getContext('2d');
    this.loop();
    this.scale = 1;

    this.canvas.onwheel = e => {
      this.zoom(e);
      this.draw();
    }

    this.isPanning = false;

    this.canvas.onmousedown = (e) => {
      this.isPanning = true;
    };

    this.canvas.onmouseup = (e) => {
      this.isPanning = false;
    };

    this.canvas.onmousemove = (e) => {
      if (!this.isPanning) return;
      this.camera.x -= e.movementX *3 / this.scale;
      this.camera.y -= e.movementY *3 / this.scale;
      this.draw();
    };

    document.onkeydown = ({keyCode}) => {
      const step = this.canvas.width / 4;
      switch (keyCode) {
        case 37:
          this.camera.x -= step;
          break;
        case 38:
          this.camera.y -= step;
          break;
        case 39:
          this.camera.x += step;
          break;
        case 40:
          this.camera.y += step;
          break;
      }
      this.draw();
    };

    document.addEventListener("keypress", ({keyCode}) => {
      if (keyCode === 32) {
        this.camera = {
          x: 0,
          y: 0,
        };
      }
      this.draw();
    });

  }

  loop() {
    if (!this.map.finished && !this.isPanning) {
      this.frame = requestAnimationFrame(this.loop.bind(this));
      this.resize();
      this.draw();
    }
  }

  cancel() {
    cancelAnimationFrame(this.frame);
  }

  resize() {
    const canvas = this.canvas;
    var cssToRealPixels = window.devicePixelRatio || 1;
    var displayWidth = Math.floor(canvas.clientWidth * cssToRealPixels);
    var displayHeight = Math.floor(canvas.clientHeight * cssToRealPixels);
    if (canvas.width !== displayWidth ||
        canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
  }

  zoom(event) {
    event.preventDefault();
    const {offsetX, offsetY} = event;
    const ratio = {
      x: (offsetX - this.canvas.width / 2) / (this.canvas.width / 2),
      y: (offsetY - this.canvas.height / 2) / (this.canvas.height / 2),
    }
    const dir = Math.abs(event.deltaY) / event.deltaY;
    const oldScale = this.scale;
    this.scale += event.deltaY * 0.001;
    this.scale = Math.min(Math.max(.0125, this.scale), 4);
  }

  drawExits(room) {
    const ctx = this.ctx;
    const topX = (room.x * (this.roomSize + this.roomMargin * 2)) - this.roomSize / 2;
    const topY = (room.y * (this.roomSize + this.roomMargin * 2)) - this.roomSize / 2;
    const corridorLength = this.roomMargin * 2;
    if (room.allExits.north) {
      const x = topX + this.roomSize / 2 - this.corridorWidth / 2;
      const y = topY + this.roomSize / 2;
      ctx.fillRect(x, y, this.corridorWidth, -(this.roomSize + this.roomMargin * 2));
    }
    if (room.allExits.east) {
      const x = topX + this.roomSize / 2;
      const y = topY + this.roomSize / 2 - this.corridorWidth / 2;
      ctx.fillRect(x, y, (this.roomSize + this.roomMargin * 2), this.corridorWidth);
    }
    if (room.allExits.south) {
      const x = topX + this.roomSize / 2 - this.corridorWidth / 2;
      const y = topY + this.roomSize / 2;
      ctx.fillRect(x, y, this.corridorWidth, (this.roomSize + this.roomMargin * 2));
    }
    if (room.allExits.west) {
      const x = topX - this.roomSize / 2 - this.roomMargin * 2;
      const y = topY + this.roomSize / 2 - this.corridorWidth / 2;
      ctx.fillRect(x, y, (this.roomSize + this.roomMargin * 2), this.corridorWidth);
    }
  }

  drawRoom(room, expansions = true) {
    const {ctx} = this;
    let topX = 0;
    let topY = 0;
    let roomWidth = this.roomSize;
    let roomHeight = this.roomSize;
    if (this.corridors && room.corridor) {
      topX += this.roomSize / 2 - this.corridorWidth / 2;
      topY += this.roomSize / 2 - this.corridorWidth / 2;
      roomWidth = this.corridorWidth;
      roomHeight = this.corridorWidth;
    } else {
      if (this.expansions && expansions) {
        const {north, south, east, west} = room.expansions;
        const step = this.roomSize / 2 - this.roomMargin;
        topX -= west * step;
        roomWidth += west * step;
        topY -= south * step;
        roomHeight += south * step;
        roomWidth += east * step;
        roomHeight += north * step;
      }
    }
    topX += (room.x * (this.roomSize + this.roomMargin * 2)) - this.roomSize / 2;
    topY += (room.y * (this.roomSize + this.roomMargin * 2)) - this.roomSize / 2;
    ctx.fillRect(topX, topY, roomWidth, roomHeight);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    const offset = {
      x: (this.canvas.width / this.scale) / 2 - this.camera.x,
      y: (this.canvas.height / this.scale) / 2 - this.camera.y,
    }
    ctx.scale(this.scale, this.scale);
    ctx.translate(offset.x, offset.y);

    if (this.showGrid) {
      ctx.fillStyle = 'grey';
      for (const room of Object.values(this.map.rooms)) {
        this.drawRoom(room, false);
      }
    }

    ctx.fillStyle = 'white';
    for (const room of Object.values(this.map.rooms)) {
      if (this.coloredRooms) {
        ctx.fillStyle = room.color;
      }
      this.drawExits(room);
      this.drawRoom(room);
    }
    if (this.showExplorers) {
      this.drawExplorers();
    }
    ctx.restore();
  }

  drawExplorers() {
    const {ctx} = this;
    for (const [i, explorer] of this.map.explorers.filter((v, i) => i < 4).entries()) { // TODO color code explorers
      let pathI = 0;
      for (const coords of explorer.path) {
        switch (i) {
          case 0:
            ctx.fillStyle = 'blue';
            break;
          case 1:
            ctx.fillStyle = 'yellow';
            break;
          case 2:
            ctx.fillStyle = 'brown';
            break;
          case 3:
            ctx.fillStyle = 'pink';
            break;
        }
        const width = this.roomSize / 3;
        const height = this.roomSize / 3;
        let offsetX;
        let offsetY;
        switch (i) {
          case 0 :
            offsetX = -this.roomSize / 2;
            offsetY = -this.roomSize / 2;
            break;
          case 1 :
            offsetX = -this.roomSize / 2;
            offsetY = +this.roomSize / 2 - height;
            break;
          case 2 :
            offsetX = +this.roomSize / 2 - width;
            offsetY = -this.roomSize / 2;
            break;
          case 3 :
            offsetX = +this.roomSize / 2 - width;
            offsetY = +this.roomSize / 2 - height;
            break;
        }
        const topX = (coords.x * (this.roomSize + this.roomMargin * 2)) + offsetX;
        const topY = (coords.y * (this.roomSize + this.roomMargin * 2)) + offsetY;
        ctx.fillRect(topX, topY, width, height);

        const fontSize = (Math.floor(this.roomSize / 5) + 1);
        ctx.font = '' + fontSize + 'px serif';
        ctx.fillStyle = 'black';
        ctx.fillText('' + pathI, topX, topY + fontSize);
        pathI++;
      }
    }
  }
}
