<script>
  import nprogress from 'nprogress';

  import { windowSize } from 'stores/screen';

  nprogress.configure({ minimum: 0.16, showSpinner: false });

  nprogress.error = (skip = false) => {
    document.getElementById('nprogress').classList.add('error');
    nprogress.set(0.95);
    if (!skip) {
      setTimeout(nprogress.done, 1500);
    }
  };

  // Allow race of observerable actions
  nprogress.observers = new Set();
  nprogress.observe = async (...args) => {
    // Track observerable
    const id = Date.now();
    nprogress.observers.add(id);

    try {
      // Start
      nprogress.start();
      const result = await Promise.all(args);

      // Mark as done only if no other active observables
      nprogress.observers.delete(id);
      if (nprogress.observers.size === 0) {
        nprogress.done();
      }

      // Return result
      return result;
    } catch (err) {
      // Throw error
      nprogress.observers.delete(id);
      nprogress.error(nprogress.observers.size);
      throw err;
    }
  };
</script>

<div
  id="container"
  class="container"
  style=" --window-height: {$windowSize.height}px; --window-width: {$windowSize.width}px; "
>
  <slot />
</div>
