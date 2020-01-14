(function() {
  const btn = document.getElementById("btn-debug");

  const foldsWrapper = document.getElementById("folds");
  const center = document.getElementById("fold-center");
  const bottom = document.getElementById("fold-bottom");
  const top = document.getElementById("fold-top");

  const baseContent = document.getElementById("base-content");

  let state = {
    disposed: false,
    targetScroll: 0,
    scroll: 0,
    mouse: {
      x: 0,
      y: 0
    },
    follower: {
      x: 0,
      y: 0
    },
    followerVelocity: {
      x: 0,
      y: 0
    }
  };

  function lerp(current, target, speed = 0.1, limit = 0.001) {
    let change = (target - current) * speed;
    if (Math.abs(change) < limit) {
      change = target - current;
    }
    return change;
  }

  class FoldedDom {
    constructor(wrapper, folds = null, scrollers = null) {
      this.wrapper = wrapper;
      this.folds = folds;
      this.scrollers = [];

      this.scale = [1, 1];
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
          scroller = document.createElement("div");
          scroller.classList.add("fold-scroller");
          fold.append(scroller);
        } else {
          scroller = this.scrollers[i];
        }
        scroller.append(copyContent);

        scrollers[i] = scroller;
      }
      this.scrollers = scrollers;
    }
    updateScrollStyles(scroll, skewAmp, rotationAmp) {
      const folds = this.folds;
      const scrollers = this.scrollers;
      let centerIndex = Math.floor(folds.length / 2);
      let scrollFix = centerIndex * -100;

      const centerFold = this.folds[centerIndex];

      for (let i = 0; i < folds.length; i++) {
        const centerRelativeIndex = i - centerIndex;

        const fold = folds[i];
        const scroller = scrollers[i];
        let percentage = `${scrollFix - centerRelativeIndex * 100 + 100}%`;
        let pixels = 0;
        let translateY = percentage;

        if (centerRelativeIndex > 0) {
          // The bottom folds, start at some place in the center(exactly height of middle folds).
          // So to sync it up it needs to use pixels of the content instead.
          pixels += -centerFold.offsetHeight;
          translateY = `${pixels}px`;
        }

        // Scroller fixed so its aligned
        // scroller.style.transform = `translateY(${100 * -i}%)`;
        // And the content is the one that scrolls
        let scale = 1;
        if (i === 0 || i === 2) {
          scale = this.scale[i / 2];
        }
        scroller.style.transform = `translateY(${translateY}) scaleY(${scale})`;
        scroller.children[0].style.transform = `translateY(${scroll}px)`;
      }
    }
    updateFoldTransforms() {
      let y, x;

      x = state.follower.x * window.innerWidth * 0.25;
      y = state.follower.y * window.innerHeight * 0.25;

      foldsWrapper.style.transform = `translate(${x}px, ${y}px)`;

      this.scale = [];
      let scales = this.scale;

      function getTransform(from, to, reverseRotation = false) {
        // [] - Not quite sure why it doesn't work like the bottoone
        //It seems like it grows in the incorrect way, copying the bottom one.
        // As it gets closer it needs to increase, and as it moves away it needs to decrease
        let relX = to.x - from.x;
        let relY = to.y - from.y;
        let relZ = to.z - from.z;

        let xAngle = Math.atan2(relZ, relY);
        if (reverseRotation) {
          xAngle = Math.atan2(relY, relZ);
        }
        /* 
    After a few years of work. 
      1- Make sure the perspective origin is at the right place.  
          Each fold needs it's own perspective plane
          - Top fold:  perspective: 50% 100%. AKA, at it's bottom
          - bottom fold:  perspective: 50% 0%. AKA, at it's top

      2. Make the rotationX angle negavite and move it by 90deg
              Why? not sure. It works

    */

        // This takes care of positioning the correct part of the plane on the corner.
        // It can't always be the end of the plane because that grows as the rotation changes.
        // This finds the correct spot that matches the window's width

        let xAngleDegrees = (xAngle / Math.PI) * 180;
        if (reverseRotation) {
          xAngleDegrees = -xAngleDegrees - 90;
        }

        //
        const zyLength = length(relZ, relY);

        // Althought the rotation doesn't quite place the end at the bottom
        // Scaling it after all transforms does do the trick
        let scale = zyLength / window.innerHeight;

        let skewAngle = Math.atan2(-relY, relX);
        let skewAngleDegrees = ((skewAngle + Math.PI / 2) / Math.PI) * 180;
        scales.push(1 / scale);

        return `skewX(${skewAngleDegrees}deg) rotate3d(1,0, 0,${xAngleDegrees +
          0}deg) scale3d(1,${scale},1)`;
      }

      let centerRect = center.getBoundingClientRect();
      const centerX = centerRect.left + centerRect.width / 2;
      const centerYtop = centerRect.top;
      const centerYbottom = centerRect.top + centerRect.height;
      const centerZ = 0;

      let toX = window.innerWidth / 2;
      let topY = 0;
      let bottomY = window.innerHeight;
      // The size of the bottom thing is around 50vh weird
      // Welp, the perspective is window.innerHeight. So I think that's why
      let toZ = window.innerHeight;

      let bottomTransform = getTransform(
        {
          x: centerX,
          y: centerYbottom,
          z: centerZ
        },
        {
          x: toX,
          y: bottomY,
          z: toZ
        }
      );
      // Parameters seem fine
      let topTransform = getTransform(
        {
          x: centerX,
          y: centerYtop,
          z: centerZ
        },
        {
          x: toX,
          y: topY,
          z: toZ
        },
        true
      );

      bottom.style.transform = bottomTransform;
      top.style.transform = topTransform;
    }
  }

  const toggleDebug = () => {
    document.body.classList.toggle("debug");
  };
  btn.addEventListener("click", toggleDebug);

  const length = (x, y, z = 0) => Math.sqrt(x * x + y * y + z * z);

  let insideFold;

  let tick = () => {
    if (state.disposed) return;

    // Calculate the scroll based on how much the content is outside the centerFold
    document.body.style.height =
      insideFold.scrollers[0].children[0].clientHeight -
      center.clientHeight +
      window.innerHeight +
      "px";

    // Make it mouse bouncy with a spring
    let spring = 0.03;
    let friction = 0.75;

    let relMouse = {
      x: (state.mouse.x - state.follower.x) * spring,
      y: (state.mouse.y - state.follower.y) * spring
    };
    state.followerVelocity.x =
      (state.followerVelocity.x + relMouse.x) * friction;
    state.followerVelocity.y =
      (state.followerVelocity.y + relMouse.y) * friction;
    state.follower.x += state.followerVelocity.x;
    state.follower.y += state.followerVelocity.y;

    state.targetScroll = -(
      document.documentElement.scrollTop || document.body.scrollTop
    );

    state.scroll += lerp(state.scroll, state.targetScroll, 0.1, 0.0001);

    insideFold.updateScrollStyles(state.scroll);
    insideFold.updateFoldTransforms();

    requestAnimationFrame(tick);
  };

  //  EVENTS
  let onMouseMove = ev => {
    state.mouse.x = ev.clientX / window.innerWidth;
    state.mouse.y = ev.clientY / window.innerHeight;

    let mouseX = state.mouse.x * 2 - 1;
    let mouseY = state.mouse.y * 2 - 1;

    // Do the length clamping directly on the mouse so the bounce effect happens even out
    // of bounce(outside of min length)

    let mouseLen = Math.min(0.5, length(mouseX, mouseY));
    let mouseAngle = Math.atan2(mouseY, mouseX);

    state.mouse.x = Math.cos(mouseAngle) * mouseLen;
    state.mouse.y = Math.sin(mouseAngle) * mouseLen;
  };
  let onTouchMove = ev => {
    onMouseMove(ev.touches[0]);
  };
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("touchmove", onTouchMove);

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
    insideFold = new FoldedDom(foldsWrapper, [top, center, bottom]);
    insideFold.setContent(baseContent);
    tick();
  });
})();
