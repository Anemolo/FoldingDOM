(function() {
  function lerp(current, target, speed = 0.1, limit = 0.001) {
    let change = (target - current) * speed;
    if (Math.abs(change) < limit) {
      change = target - current;
    }
    return change;
  }

  const baseContent = document.getElementById("base-content");

  const foldWrapper = document.getElementById("fold-wrapper");

  const btn = document.getElementById("btn-debug");
  const toggleDebug = () => {
    document.body.classList.toggle("debug");
  };
  btn.addEventListener("click", toggleDebug);

  let state = {
    scroll: 0,
    targetScroll: 0,
    progress: 0,
    targetProgress: 0,
    disposed: false
  };
  // The folds can be either pre-generated or Folded dom can generate them for you.
  class FoldedDom {
    constructor(wrapper, folds = null) {
      this.wrapper = wrapper;
      this.folds = folds;
      this.centerHeight = 0;
    }
    createFold(side = "center", index = 0) {
      const fold = document.createElement("div");
      fold.classList.add("fold");
      switch (side) {
        case "before":
          fold.classList.add("fold-before");
          fold.classList.add("fold-before-" + index);
          break;
        case "after":
          fold.classList.add("fold-after");
          fold.classList.add("fold-after-" + index);
          break;
        default:
          fold.classList.add("fold-middle");
          break;
      }

      const content = this.baseContent.cloneNode(true);

      content.classList.remove("base-content");
      content.id = "";

      const scroller = document.createElement("div");
      scroller.classList.add("fold-scroller");
      scroller.append(content);

      fold.append(scroller);

      return fold;
    }
    generateSide(baseContent, foldCount, side) {
      const centerFold = this.createFold(0, 0);

      const beforeFolds = [];
      const afterFolds = [];
      for (let i = 0; i < foldCount; i++) {
        beforeFolds.push(this.createFold("before", i + 1));
        afterFolds.push(this.createFold("after", i + 1));
      }

      // Reverse to pace index 0 next to the center element
      let folds = beforeFolds
        .reverse()
        .concat(centerFold)
        .concat(afterFolds);
      const foldedDomEle = document.createElement("div");
      foldedDomEle.classList.add("wrapper-3d");
      foldedDomEle.classList.add("side-" + side);
      folds.forEach(fold => {
        foldedDomEle.append(fold);
      });
      this.wrapper.append(foldedDomEle);

      return { folds, wrapper: foldedDomEle };
    }
    generateFolds(baseContent, foldCount) {
      this.baseContent = baseContent;

      const leftFolds = this.generateSide(baseContent, 1, "left");
      const rightFolds = this.generateSide(baseContent, 1, "right");

      this.centerFold =
        rightFolds.folds[Math.floor(leftFolds.folds.length / 2)];

      this.leftFolds = leftFolds;
      this.rightFolds = rightFolds;
      // return folds;
    }
    updateStyles(progress) {
      let leftFolds = this.leftFolds.folds;
      let rightFolds = this.rightFolds.folds;
      let center = Math.floor(leftFolds.length / 2);
      let scroll = center * -100;

      for (let i = 0; i < leftFolds.length; i++) {
        let foldLeft = leftFolds[i];
        let foldRight = rightFolds[i];
        const centerRelativeIndex = i - center;
        let percentage = `${scroll - centerRelativeIndex * 100 + 100}%`;
        let pixels = 0;
        let translateY = percentage;
        // The top folds are easy to sync because we only need to move them by 100% of the folds
        if (centerRelativeIndex > 0) {
          // The bottom folds, start at some place in the center(exactly height of middle folds).
          // So to sync it up it needs to use pixels of the content instead.
          pixels += -this.centerFold.offsetHeight;
          translateY = `${pixels}px`;
        }
        foldLeft.children[0].style.transform = `translateY(${translateY})`;
        foldLeft.children[0].children[0].style.transform = `translateY(${progress}px)`;
        foldRight.children[0].style.transform = `translate(-50%, ${translateY})`;
        foldRight.children[0].children[0].style.transform = `translateY(${progress}px)`;
      }
    }
  }

  // We want the scroll to be inside the middle fold.
  // So it needs to be height of screen + the height of the content - minus the height of the fold.
  // This makes it so we only create a scrollbar if the content is bigger than the middle fold.
  let foldedDomCenter;
  let tick = () => {
    if (state.disposed) return;
    document.body.style.height =
      foldedDomCenter.centerFold.children[0].children[0].clientHeight +
      -foldedDomCenter.centerFold.clientHeight +
      window.innerHeight +
      "px";

    state.targetScroll = -(
      document.documentElement.scrollTop || document.body.scrollTop
    );

    state.scroll += lerp(state.scroll, state.targetScroll, 0.1, 0.0001);

    let progress = state.scroll;
    foldedDomCenter.updateStyles(progress + baseContent.offsetTop);

    requestAnimationFrame(tick);
  };
  
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
    foldedDomCenter = new FoldedDom(foldWrapper);
    const foldCount = 1;
    foldedDomCenter.generateFolds(baseContent, foldCount);
    tick();
  });
})();
