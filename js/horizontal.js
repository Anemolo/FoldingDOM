(function() {
  const wrapper = document.getElementById("fold-effect");

  const folds = Array.from(document.getElementsByClassName("fold"));

  const baseContent = document.getElementById("base-content");

  let state = {
    disposed: false,
    targetScroll: 0,
    scroll: 0
  };

  function lerp(current, target, speed = 0.1, limit = 0.001) {
    let change = (target - current) * speed;
    if (Math.abs(change) < limit) {
      change = target - current;
    }
    return change;
  }
  let scaleFix = 0.992;

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
          let sizeFixEle = document.createElement("div");
          sizeFixEle.classList.add("fold-size-fix");
          // sizeFixEle.style.transform = `scaleY(${scaleFix})`;

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
    updateStyles(scroll) {
      const folds = this.folds;
      const scrollers = this.scrollers;

      for (let i = 0; i < folds.length; i++) {
        const scroller = scrollers[i];

        // Scroller fixed so its aligned
        // scroller.style.transform = `translateY(${100 * -i}%)`;
        // And the content is the one that scrolls
        scroller.children[0].style.transform = `translateX(${scroll}px)`;
      }
    }
  }

  let insideFold;

  const mainFold = folds[folds.length - 1];
  let tick = () => {
    if (state.disposed) return;

    // Calculate the scroll based on how much the content is outside the mainFold

    // state.targetScroll = -(
    //   document.documentElement.scrollLeft || document.body.scrollLeft
    // );
    state.targetScroll = Math.max(
      Math.min(0, state.targetScroll),
      -insideFold.scrollers[0].children[0].clientWidth + mainFold.clientWidth
    );
    state.scroll += lerp(state.scroll, state.targetScroll, 0.1, 0.0001);

    insideFold.updateStyles(state.scroll);

    requestAnimationFrame(tick);
  };
  /** ATTACH EVENTS */
  let lastClientX = null;
  let isDown = false;

  let onDown = ev => {
    // console.log(
    //   Math.max(
    //     state.targetScroll,
    //     -insideFold.scrollers[0].children[0].clientWidth + mainFold.clientWidth
    //   )
    // );
    console.log(
      "s",
      -insideFold.scrollers[0].children[0].clientWidth + mainFold.clientWidth
    );
    isDown = true;
  };
  let onUp = ev => {
    isDown = false;
  };

  window.addEventListener("mousedown", onDown);
  window.addEventListener("mouseup", onUp);
  window.addEventListener("mouseout", ev => {
    var from = ev.relatedTarget || ev.toElement;
    if (!from || from.nodeName == "HTML") {
      // stop your drag event here
      // for now we can just use an alert
      isDown = false;
    }
  });
  window.addEventListener("touchstart", onDown);
  window.addEventListener("touchend", onUp);
  window.addEventListener("touchcancel", onUp);

  window.addEventListener("mousemove", ev => {
    if (lastClientX && isDown) {
      state.targetScroll += ev.clientX - lastClientX;
    }
    lastClientX = ev.clientX;
  });

  window.addEventListener("touchmove", ev => {
    let touch = ev.touches[0];
    if (lastClientX && isDown) {
      state.targetScroll += ev.clientX - lastClientX;
    }
    lastClientX = ev.clientX;
  });

  window.addEventListener("wheel", ev => {
    // Fixefox delta is like 1px and chrome 100
    state.targetScroll += -Math.sign(ev.deltaY) * 30;
  });
  
  /***********************************/
  /********** Preload stuff **********/

  // Preload images
  const preloadImages = () => {
    return new Promise((resolve, reject) => {
      imagesLoaded(document.querySelectorAll('.content__img'), resolve);
    });
  };
  
  // And then..
  preloadImages().then(() => {
    // Remove the loader
    document.body.classList.remove('loading');
    // INITIALIZE
    insideFold = new FoldedDom(wrapper, folds);
    insideFold.setContent(baseContent);

    tick();
  });
})();
