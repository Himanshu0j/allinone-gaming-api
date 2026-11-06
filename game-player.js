/**
 * Shared responsive game iframe player.
 */
(function (window) {
	'use strict';

	var playerEl = null;
	var frameEl = null;
	var loaderEl = null;
	var progressEl = null;
	var statusEl = null;
	var statusTitleEl = null;
	var statusTextEl = null;
	var closeEl = null;
	var backdropEl = null;
	var isOpen = false;
	var progressTimer = null;
	var currentProgress = 0;

	var DEFAULT_ERROR_TITLE = 'Under maintenance';
	var DEFAULT_ERROR_TEXT = 'This game is temporarily unavailable. Please try another game.';

	function getElements() {
		if (!playerEl) {
			playerEl = document.getElementById('igl-game-player');
		}

		if (!playerEl) {
			return null;
		}

		frameEl = playerEl.querySelector('.igl-game-player__frame');
		loaderEl = playerEl.querySelector('.igl-game-player__loader');
		progressEl = playerEl.querySelector('.igl-game-player__progress-text');
		statusEl = playerEl.querySelector('.igl-game-player__status');
		statusTitleEl = playerEl.querySelector('.igl-game-player__status-title');
		statusTextEl = playerEl.querySelector('.igl-game-player__status-text');
		closeEl = playerEl.querySelector('.igl-game-player__close');
		backdropEl = playerEl.querySelector('.igl-game-player__backdrop');

		return playerEl;
	}

	function clearProgressTimer() {
		if (progressTimer) {
			window.clearInterval(progressTimer);
			progressTimer = null;
		}
	}

	function setProgress(value) {
		var next = Math.max(0, Math.min(100, Math.round(value)));

		if (next < currentProgress) {
			return;
		}

		currentProgress = next;

		if (progressEl) {
			progressEl.textContent = String(next) + '%';
		}
	}

	function startProgressTimer() {
		clearProgressTimer();
		setProgress(8);

		progressTimer = window.setInterval(function () {
			if (currentProgress >= 88) {
				clearProgressTimer();
				return;
			}

			var step = currentProgress < 40 ? 6 : (currentProgress < 70 ? 3 : 2);
			setProgress(currentProgress + step);
		}, 120);
	}

	function isErrorUrl(url) {
		return /\/error(?:\?|$)/i.test(url)
			|| (/[?&]msg=/i.test(url) && /not[+%20_ -]*available/i.test(url));
	}

	function setStatusVisible(visible, title, text) {
		if (!statusEl) {
			return;
		}

		if (visible) {
			statusEl.hidden = false;
			if (statusTitleEl) {
				statusTitleEl.textContent = title || DEFAULT_ERROR_TITLE;
			}
			if (statusTextEl) {
				statusTextEl.textContent = text || DEFAULT_ERROR_TEXT;
			}
			return;
		}

		statusEl.hidden = true;
		if (statusTitleEl) {
			statusTitleEl.textContent = DEFAULT_ERROR_TITLE;
		}
		if (statusTextEl) {
			statusTextEl.textContent = DEFAULT_ERROR_TEXT;
		}
	}

	function setLoading(loading) {
		if (loaderEl) {
			loaderEl.hidden = !loading;
			if (loading) {
				loaderEl.classList.remove('is-error');
				setStatusVisible(false);
			}
		}

		if (!loading) {
			clearProgressTimer();
			currentProgress = 0;
			if (progressEl) {
				progressEl.textContent = '0%';
			}
			setStatusVisible(false);
		}
	}

	function lockScroll() {
		document.body.classList.add('igl-game-player-open');
	}

	function unlockScroll() {
		document.body.classList.remove('igl-game-player-open');
	}

	function reveal() {
		var root = getElements();

		if (!root) {
			return false;
		}

		isOpen = true;
		lockScroll();
		root.classList.add('is-visible');
		root.setAttribute('aria-hidden', 'false');

		return true;
	}

	function close() {
		var root = getElements();

		if (!root || !isOpen) {
			return;
		}

		clearProgressTimer();
		isOpen = false;
		root.classList.remove('is-visible');
		root.setAttribute('aria-hidden', 'true');
		unlockScroll();

		if (frameEl) {
			frameEl.removeAttribute('src');
			frameEl.removeAttribute('title');
		}

		if (loaderEl) {
			loaderEl.classList.remove('is-error');
		}

		currentProgress = 0;
		setLoading(false);
	}

	function openLoading(title) {
		var root = getElements();

		if (!root || !frameEl) {
			return false;
		}

		frameEl.removeAttribute('src');
		frameEl.setAttribute('title', title || 'Game');
		setLoading(true);
		startProgressTimer();
		reveal();

		return true;
	}

	function loadUrl(url, title) {
		var root = getElements();

		if (!root || !frameEl || !url) {
			return false;
		}

		if (isErrorUrl(url)) {
			return showError(DEFAULT_ERROR_TITLE);
		}

		if (!isOpen) {
			openLoading(title);
		}

		clearProgressTimer();
		setProgress(100);

		frameEl.setAttribute('title', title || 'Game');
		frameEl.setAttribute('allow', 'autoplay; fullscreen; payment');
		frameEl.setAttribute('loading', 'eager');
		frameEl.setAttribute('src', url);
		setLoading(false);

		return true;
	}

	function open(url, title) {
		return loadUrl(url, title);
	}

	function showError(message) {
		var root = getElements();
		var title = DEFAULT_ERROR_TITLE;
		var text = DEFAULT_ERROR_TEXT;

		if (!root) {
			return false;
		}

		message = String(message || '').trim();

		if (message) {
			if (/agent code/i.test(message)) {
				title = message;
				text = 'Enter your agent code to continue.';
			} else {
				title = 'Under maintenance';
			}
		}

		clearProgressTimer();
		currentProgress = 0;

		if (!isOpen) {
			reveal();
		}

		if (frameEl) {
			frameEl.removeAttribute('src');
		}

		if (progressEl) {
			progressEl.textContent = '0%';
		}

		if (loaderEl) {
			loaderEl.hidden = false;
			loaderEl.classList.add('is-error');
		}

		setStatusVisible(true, title, text);

		return true;
	}

	function bindEvents() {
		var root = getElements();

		if (!root || root.getAttribute('data-bound') === '1') {
			return;
		}

		root.setAttribute('data-bound', '1');

		if (closeEl) {
			closeEl.addEventListener('click', function (event) {
				event.preventDefault();
				close();
			});
		}

		if (backdropEl) {
			backdropEl.addEventListener('click', close);
		}

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape' && isOpen) {
				close();
			}
		});
	}

	document.addEventListener('DOMContentLoaded', bindEvents);

	window.igamingGamePlayer = {
		openLoading: openLoading,
		loadUrl: loadUrl,
		open: open,
		close: close,
		showError: showError,
		setProgress: setProgress
	};
})(window);
