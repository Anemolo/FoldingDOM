(function() {
  function lerp(current, target, speed = 0.1, limit = 0.001) {
    let change = (target - current) * speed;
    if (Math.abs(change) < limit) {
      change = target - current;
    }
    return change;
  }

  const wrapper = document.getElementById("fold-effect");
  const btn = document.getElementById("btn-debug");

  const folds = Array.from(document.getElementsByClassName("fold"));
  const baseContent = document.getElementById("base-content");

  // Scale fix removes the lines between folds for non-retina devices
  let scaleFix = 0.992;

  const toggleDebug = () => {
    wrapper.classList.toggle("debug");
  };
  btn.addEventListener("click", toggleDebug);
  let state = {
    disposed: false,
    targetScroll: 0,
    scroll: 0,
    mouse: { x: 0.5, y: 0.5 },
    follower: { x: 0.5, y: 0.5 }
  };

  class FoldedDom {
    constructor(wrapper, folds = null, scrollers = null) {
      this.wrapper = wrapper;
      this.folds = folds;
      this.scrollers = [];
    }
    setContent(baseContent, createScrollers = true) {
      const folds = this.folds;
      if (!folds) return;

      let scrollers = [];

      for (let i = 0; i < folds.length; i++) {
        const fold = folds[i];
        const copyContent = baseContent.cloneNode(true);
        copyContent.id = "";
        let scroller;
        if (createScrollers) {
          // By default the transform is going to have pixel imperfection
          // https://bugs.chromium.org/p/chromium/issues/detail?id=600120
          let sizeFixEle = document.createElement("div");
          sizeFixEle.classList.add("fold-size-fix");
          sizeFixEle.style.transform = `scale(${scaleFix})`;

          scroller = document.createElement("div");
          scroller.classList.add("fold-scroller");

          sizeFixEle.append(scroller);
          fold.append(sizeFixEle);
        } else {
          scroller = this.scrollers[i];
        }
        scroller.append(copyContent);

        scrollers[i] = scroller;
      }
      this.scrollers = scrollers;
    }
    updateStyles(scroll, skewAmp, rotationAmp) {
      const folds = this.folds;
      const scrollers = this.scrollers;
      let centerIndex = Math.floor(folds.length / 2);
      let translateSign = Math.sign(centerIndex);

      for (let i = 0; i < folds.length; i++) {
        let relIndex = i - centerIndex;
        let translateSign = Math.sign(relIndex);

        const fold = folds[i];
        const scroller = scrollers[i];

        // Scroller fixed so its aligned
        scroller.style.transform = `translateY(${100 * -i}%)`;
        // And the content is the one that scrolls
        scroller.children[0].style.transform = `translateY(${scroll}px)`;
        let skewValue = 2 * translateSign * (skewAmp - 0.5) * 2;
        let rotateValue = 2 * translateSign * (rotationAmp - 0.5) * 2;
        let transform = `translate3d(0,${4.7619047619 *
          translateSign}vh,0) rotateX(${-rotateValue}deg) skewX(${-skewValue}deg)`;

        if (Math.abs(relIndex) > 1) {
          for (let j = 0; j <= Math.abs(relIndex) - 2; j++) {
            transform = `${transform} translate3d(0,${4.7619047619 *
              translateSign}vh,0)  rotateX(${-rotateValue *
              2}deg) skewX(${-skewValue * 2}deg)`;
          }
        }

        // let transform = `rotateX(${-rotateValue}deg) skewX(${-skewValue}deg)`;
        // if (Math.abs(relIndex) > 1) {
        //   for (let j = 0; j <= Math.abs(relIndex) - 2; j++) {
        //     transform = `${transform}  translateY(${100 *
        //       translateSign}%) rotateX(${-rotateValue *
        //       2}deg) skewX(${-skewValue * 2}deg)`;
        //   }
        // }
        fold.style.transform = transform + ` scale3d(1,${1 / scaleFix},1)`;
      }
    }
  }

  let roundedFold;

  // setScrollStyles(state.y);
  let tick = () => {
    if (state.disposed) return;
    document.body.style.height =
      roundedFold.scrollers[0].children[0].clientHeight + "px";

    state.targetScroll = -(
      document.documentElement.scrollTop || document.body.scrollTop
    );
    state.scroll += lerp(state.scroll, state.targetScroll, 0.1, 0.0001);

    state.follower.x += lerp(state.follower.x, state.mouse.x, 0.1, 0.0001);
    state.follower.y += lerp(state.follower.y, state.mouse.y, 0.1, 0.0001);
    // setScrollStyles(0);
    roundedFold.updateStyles(
      state.scroll,
      1 - state.follower.x,
      1 - state.follower.y
    );

    requestAnimationFrame(tick);
  };

  // Events
  let handleMouseMove = ev => {
    state.mouse.x = ev.clientX / window.innerWidth;
    state.mouse.y = ev.clientY / window.innerHeight;
  };

  let handleTouchMove = ev => {
    handleMouseMove(ev.touches[0]);
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("touchmove", handleTouchMove);

  //  Initialize
  roundedFold = new FoldedDom(wrapper, folds);
  roundedFold.setContent(baseContent);
  tick();
})();
