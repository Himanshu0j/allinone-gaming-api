(function () {
	'use strict';

	var cfg = window.igamingBrandLaunch || {};
	var hasAccess = !!cfg.hasAccess;
	var openInTabBrand = !!cfg.openInTab;
	var URL_CACHE_PREFIX = 'igl_launch_url_';
	var URL_CACHE_TTL = 5 * 60 * 1000;
	var gate = window.acaAgentGate;
	var launching = false;

	function getCachedLaunchUrl(productId) {
		// Always request a fresh launch so user_id rotates every time.
		return '';
	}

	function setCachedLaunchUrl(productId, url) {
		// No URL caching â each play needs a new SoftAPI session/user_id.
	}

	function openGamePlayer(url, openInTab) {
		if (!url) {
			return false;
		}

		if (openInTab || openInTabBrand) {
			closeGamePlayer();
			// One new tab only. window.open often returns null even when the tab opens,
			// so Topbet must not fall back to navigating this page or opening a blank tab.
			var win = window.open(url, '_blank', 'noopener,noreferrer');
			if (!win && !openInTabBrand) {
				window.location.href = url;
			}
			return true;
		}

		if (window.igamingGamePlayer) {
			if (typeof window.igamingGamePlayer.loadUrl === 'function') {
				window.igamingGamePlayer.loadUrl(url);
				return true;
			}
			if (typeof window.igamingGamePlayer.open === 'function') {
				window.igamingGamePlayer.open(url);
				return true;
			}
		}
		// Never navigate away from the brand page â keep launch in the iframe overlay.
		if (window.igamingGamePlayer && typeof window.igamingGamePlayer.showError === 'function') {
			window.igamingGamePlayer.showError((cfg.i18n && cfg.i18n.maintenance) ? cfg.i18n.maintenance : 'Under maintenance');
		}
		return false;
	}

	function showGamePlayerLoading() {
		if (window.igamingGamePlayer && typeof window.igamingGamePlayer.openLoading === 'function') {
			window.igamingGamePlayer.openLoading();
			return true;
		}
		return false;
	}

	function closeGamePlayer() {
		if (window.igamingGamePlayer && typeof window.igamingGamePlayer.close === 'function') {
			window.igamingGamePlayer.close();
		}
	}

	function requireAccess(thenFn) {
		if (hasAccess) {
			thenFn('');
			return;
		}
		if (!gate || typeof gate.require !== 'function') {
			window.location.reload();
			return;
		}
		gate.require({
			context: 'brand',
			onSuccess: function (launchPass) {
				hasAccess = true;
				thenFn(launchPass || '');
			},
			onCancel: function () {
				window.location.href = cfg.exitUrl || '/products/';
			}
		});
	}

	function requestGame(productId) {
		if (!productId || launching) {
			return;
		}
		launching = true;
		requireAccess(function (launchPass) {
			launchGame(productId, launchPass);
		});
	}

	function launchGame(productId, launchPass) {
		if (!productId) {
			return;
		}

		var cachedUrl = getCachedLaunchUrl(productId);
		if (cachedUrl) {
			if (!openInTabBrand) {
				showGamePlayerLoading();
				if (window.igamingGamePlayer && typeof window.igamingGamePlayer.setProgress === 'function') {
					window.igamingGamePlayer.setProgress(100);
				}
			}
			openGamePlayer(cachedUrl, openInTabBrand);
			return;
		}

		if (!cfg.ajaxUrl) {
			launching = false;
			return;
		}

		if (!openInTabBrand) {
			showGamePlayerLoading();
		}
		if (window.igamingGamePlayer && typeof window.igamingGamePlayer.setProgress === 'function') {
			window.igamingGamePlayer.setProgress(15);
		}

		var body =
			'action=' + encodeURIComponent(cfg.launchAction || 'igaming_launch_game') +
			'&product_id=' + encodeURIComponent(String(productId)) +
			'&nonce=' + encodeURIComponent(cfg.nonce || '');

		if (launchPass) {
			body += '&launch_pass=' + encodeURIComponent(launchPass);
		}

		fetch(cfg.ajaxUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body,
			credentials: 'same-origin'
		})
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				if (data.success && data.data && data.data.url) {
					setCachedLaunchUrl(productId, data.data.url);
					openGamePlayer(data.data.url, !!(data.data.open_in_tab));
					launching = false;
					return;
				}

				var message = (data && data.data) ? String(data.data) : '';

				if (/agent code required/i.test(message)) {
					hasAccess = false;
					launching = false;
					closeGamePlayer();
					requireAccess(function (pass) {
						launchGame(productId, pass);
					});
					return;
				}

				throw new Error(message || ((cfg.i18n && cfg.i18n.maintenance) ? cfg.i18n.maintenance : 'Under maintenance'));
			})
			.catch(function (err) {
				var message = (err && err.message) ? String(err.message) : '';

				if (/agent code required/i.test(message)) {
					hasAccess = false;
					launching = false;
					closeGamePlayer();
					requireAccess(function (pass) {
						launchGame(productId, pass);
					});
					return;
				}

				launching = false;

				closeGamePlayer();
				if (window.igamingGamePlayer && typeof window.igamingGamePlayer.showError === 'function') {
					window.igamingGamePlayer.showError(message || 'Under maintenance');
					return;
				}
				alert(message || ((cfg.i18n && cfg.i18n.maintenance) ? cfg.i18n.maintenance : 'Under maintenance'));
			});
	}

	function bindCards() {
		document.querySelectorAll('.brand-product-card[data-product-id]').forEach(function (card) {
			card.addEventListener(
				'click',
				function (event) {
					event.preventDefault();
					event.stopPropagation();

					var productId = parseInt(card.getAttribute('data-product-id') || '0', 10);
					if (!productId) {
						return;
					}
					requestGame(productId);
				},
				true
			);
		});
	}

	document.addEventListener('DOMContentLoaded', function () {
		var locked = document.querySelector('[data-agent-locked="1"]');

		// Always intercept card clicks so product permalinks never open.
		bindCards();

		if (!hasAccess || locked) {
			requireAccess(function () {
				window.location.reload();
			});
		}
	});
})();


