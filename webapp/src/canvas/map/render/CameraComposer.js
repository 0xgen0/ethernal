import 'pixi.js';

const TMP_Matrix = new PIXI.Matrix();
const TMP_Point = new PIXI.Point();

class NewProjector extends PIXI.systems.ProjectionSystem {
  constructor(renderer) {
    super(renderer);

    this.state = {
      transform: undefined,
      root: undefined,
      resolution: undefined,
      sourceFrame: undefined,
      destinationFrame: undefined,
    };
  }

  update(destinationFrame, sourceFrame, resolution, root) {
    this.state.destinationFrame = destinationFrame
      ? destinationFrame.clone()
      : undefined;
    this.state.sourceFrame = sourceFrame ? sourceFrame.clone() : undefined;
    this.state.resolution = resolution;
    this.state.root = root;
    this.state.transform = this.transform ? this.transform.clone() : undefined;

    super.update(destinationFrame, sourceFrame, resolution, root);
  }
}

PIXI.systems.ProjectionSystem = NewProjector;

export function patchTreeSearch(interaction) {
  const search = interaction.search;
  const orig = search.recursiveFindHit;
  const newPoint = new PIXI.Point();

  // needed because camera Composer detach tree from real stage
  // and transform it direct for avoiding recalculation of transform
  search.recursiveFindHit = function(point, display, ...args) {

    if(display.isComposer) {
      display.transformPoint(point, newPoint, true);
      return orig.call(search, newPoint, display, ...args);
    }

    return orig.call(search, point, display, ...args);
  }
}


// real camera, supress transfrom mutation when move.
export class CameraComposer extends PIXI.Container {
  /**
   *
   * @param {PIXI.Container } stage - container for aply camera transform. This is kill batcher!
   * @param {PIXI.Container} [listen] - container for listening transfotmation instead themsefl
   * @param {PIXI.Container} [inverse] - inverse transform matrix
   *
   */
  constructor(stage, listen, inverse = false) {
    super();

    this.interactive = true;
    // use inverted matrix for camera (as in real cameras) instad if regular
    // regular used when `listen` is regular object why may be moved, scaled ...
    this.inverse = inverse;
    this.stage = stage;
    this.listen = listen || this;

    this.isComposer = true;

    this.addChild(stage);

    if(this.containerRenderWebGL) {
      this.containerRenderWebGL = this._render;
    } else {
      this.render = this._render;
    }

    this.visible = true;
    this.interactiveChildren = true;

  }

  updateTransform() {

    this.stage.parent = this.parent;
    this.stage.updateTransform();
    this.stage.parent = undefined;

    this.transform.updateTransform(this.parent.transform);
  }

    /**
   *
   * @param {PIXI.Renderer} renderer
   */
   _render(renderer) {
    const { projection, batch } = renderer;

    if (!projection.state) {
      projection.state = {};
      projection.__proto__ = NewProjector.prototype;
      return; // skip first render because projection system cann't pathed
    }
    const state = Object.assign({}, projection.state);

    batch.flush();

    const orig = state.transform;

    projection.transform = this.matrix;
    projection.update(
      state.destinationFrame,
      state.sourceFrame,
      state.resolution,
      state.root,
    );

    this.stage.render(renderer);

    batch.flush();

    projection.transform = orig;
    projection.update(
      state.destinationFrame,
      state.sourceFrame,
      state.resolution,
      state.root,
    );
  }

  get matrix() {

    TMP_Matrix.copyFrom(this.listen.worldTransform);

    if(this.inverse) {
      return TMP_Matrix.invert();
    }

    return TMP_Matrix;
  }

  /**
   *
   * @type {PIXI.Matrix}
   */
  get invertedMatrix() {
    TMP_Matrix.copyFrom(this.listen.worldTransform);

    if(this.inverse) {
      return TMP_Matrix;
    }

    return TMP_Matrix.invert();
  }

  /**
   * Transform from camera viewport to screen
   * @param {PIXI.IPoint} point
   * @param {PIXI.IPoint} [output]
   * @param {boolean} [inverse] - inverse matix
   */
  transformPoint(point, output = new PIXI.Point(), inverse = false) {
    const m = (inverse) ? this.invertedMatrix : this.matrix;

    m.apply(point, output);
    return output;
  }

  /**
   *
   * @param {PIXI.Rectangle} rect
   * @param {PIXI.Rectangle} [output]
   * @param {boolean} [inverse] - inverse matix
   */
  transformRect(rect, output = new PIXI.Rectangle(), inverse = false) {
    const m = (inverse) ? this.invertedMatrix : this.matrix;

    output.copyFrom(rect);

    m.apply(output, output);

    output.width *= m.a;
    output.height *= m.d;

    return output;
  }
}
