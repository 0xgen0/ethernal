import 'pixi.js';

const TMP_Rect = new PIXI.Rectangle();

export default class CulledContainer extends PIXI.Container {
  constructor() {
    super();

    /**
     * @type {{viewport: PIXI.Rectangle, updateId: number}}
     */
    this.cullProvider = undefined;
    this.childrenCulled = true;
    this.selfCulled = true;
    this.culled = false;
    this.synteticCullOnChildren = false;

    this._visible = true;
    this._renderableChildren = [];
  }

  get visible() {
    return this._visible && (!this.culled || !this.selfCulled);
  }

  set visible(v) {
    this._visible = v;
  }

  _doCull() {
    this.culled = false;

    if(!this.cullProvider || this.isLayer) {
      return false;
    }

    const {viewport} = this.cullProvider;
    const b = this.getBounds(false, TMP_Rect);

    if(b.right < viewport.left) {
      return this.culled = true;
    }

    if(b.bottom < viewport.top) {
      return this.culled = true;
    }

    if(b.left > viewport.right) {
      return this.culled = true;
    }

    if(b.top > viewport.bottom) {
      return this.culled = true;
    }

    return this.culled = false;
  }

  doCull() {
    if(!this.cullProvider) {
      return;
    }

    this._renderableChildren.length = 0;

    if(this.selfCulled && this._doCull()) {
      return;
    }

    if(!this.childrenCulled) {
      return;
    }

    for(let c of this.children) {

      c.cullProvider = this.cullProvider;
      if(c.doCull) {
        c.doCull();
      } else if(this.synteticCullOnChildren) {
        this._doCull.call(c);
      }

      if(!c.culled && c.visible ) {
        this._renderableChildren.push(c);
      }
    }
  }

  updateTransform() {
    if(this.culled && this.selfCulled) {
      return;
    }

    const origList = this.children;

    this.children = this.cullProvider && this.childrenCulled ? this._renderableChildren : this.children;

    super.updateTransform();

    this.children = origList;
  }

  render(renderer) {
    if(this.culled && this.selfCulled) {
      return;
    }

    const origList = this.children;

    this.children = this.cullProvider && this.childrenCulled ? this._renderableChildren : this.children;

    super.render(renderer);

    this.children = origList;
  }
}
