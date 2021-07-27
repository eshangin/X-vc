
// Класс для отключения отслеживания кликов по кнопке https://yandex.ru/support/metrica/code/html-markup.html
const YA_METRIKA_DISABLE_CLICKMAP_CLASS = "ym-disable-clickmap";

$(function () {
    activate();
});

function activate() {
    postMonitor();
    bindHandlers();
    tryInjectHiddenListItemBtn(1);
}

function tryInjectHiddenListItemBtn(tryNumber) {
    if (tryNumber < 30) {
        setTimeout(() => {
            let $topSidebarList = $('.sidebar-tree-list:first');
            if ($topSidebarList.length > 0) {
                injectHiddenListItemsBtn($topSidebarList)
            } else {
                tryInjectHiddenListItemBtn(tryNumber + 1);
            }
        }, 20);
    } else {
        console.warn('Не удалось найти сайдбар vc.ru')
    }
}

function injectHiddenListItemsBtn($topSidebarList) {
    let $sidebarItem = $topSidebarList.find('.sidebar-tree-list-item:first')
        .clone()
        .removeClass('sidebar-tree-list-item--active');
    $sidebarItem.find('svg').css('visibility', 'hidden');
    $sidebarItem.find('.sidebar-tree-list-item__child-item').remove();
    $sidebarItem.find('.sidebar-tree-list-item__name').text('Скрытые').addClass('x-vc-sidebar-item-text');
    $sidebarItem.addClass(YA_METRIKA_DISABLE_CLICKMAP_CLASS).removeAttr('href').removeAttr('data-gtm');
    $sidebarItem.find('a').removeAttr('href').click(function (event) {
        event.preventDefault();
        getHiddenItemsFromStorage().then(items => showHiddenItemsDialog(items));
    });
    $topSidebarList.append($sidebarItem);
}

function getHiddenItemsFromStorage() {
    return new Promise(resolve => {
        StorageHelper.getLocal(null).then(values => {
            let items = [];
            for (key in values) {
                if (key.startsWith('fi')) {
                    items.push({
                        id: key.replace('fi', ''),
                        title: values[key].t,
                        hiddenTimestamp: values[key].ht
                    })
                    //console.log(key, values[key])
                }
            }
            resolve(items);
        })
    });
}

function showHiddenItemsDialog(items) {
    //chrome.storage.local.clear();
    let itemsHtml = '';
    if (items.length > 0) {
        itemsHtml = items.sort((a, b) => b.hiddenTimestamp - a.hiddenTimestamp).map(item => {
            return `
            <div class="x-vc-hidden-item x-vc-d-flex x-vc-align-items-center">
                <div class="x-vc-text-truncate x-vc-hidden-item__title-container">
                    <a href="https://vc.ru/${item.id}" data-x-vc-dialog-post-link="">${item.title}</a>
                </div>
                <button type="button" data-x-vc-post-id="${item.id}" class="x-vc-hidden-item__restore-btn" title="Восстановить">&#x2B6E;</button>
            </div>
        `}).join('');
    }
    let $dialog = $(`
        <dialog class="${YA_METRIKA_DISABLE_CLICKMAP_CLASS} x-vc-dialog">
            <form method="dialog">
                <button type="button" class="x-vc-dialog__close-btn">&times;</button>
                <div class="x-vc-dialog__title">Скрытые посты</div>
                <hr />
                <div class="x-vc-hidden-item-list">
                    <div class="x-vc-hidden-item-list__no-items-msg">Нет скрытых постов</div>
                    ${itemsHtml}
                </div>
            </form>
        </dialog>`);
    $dialog.appendTo(document.body)[0].show();
}

function bindHandlers() {
    $(document).on('click', '.x-vc-rm-item-btn', function (event) {
        event.preventDefault();
        let $feedItem = $(this).closest('.feed__item');
        let feedItemId = getFeedItemId($feedItem);
        StorageHelper.getLocal('totalFi').then(totalHiddenItems => {
            let newTotal = totalHiddenItems ? ++totalHiddenItems : 1;
            let storageData = {};
            storageData[`fi${feedItemId}`] = {
                t: truncateString(getFeedItemTitle($feedItem), 60), // Заголовок статьи
                ht: new Date().getTime() // timestamp удаления, чтобы потом показывать отсортированные записи в списке Скрытые
            };
            storageData['totalFi'] = newTotal;
            StorageHelper.setLocal(storageData);
            hideFeedItem({ $feedItem, feedItemId, useAnimation: true });
            closeHiddenItemsDialog();
        })
    })
    $(document).on('click', '[data-x-vc-dialog-post-link], .x-vc-dialog__close-btn', function (event) {
        closeHiddenItemsDialog();
    });
    $(document).on('click', '.x-vc-hidden-item__restore-btn', function (event) {
        let feedItemId = $(this).attr('data-x-vc-post-id');
        $(this).closest('.x-vc-hidden-item').remove();
        $(`[data-x-vc-hidden-post="${feedItemId}"]`).show().removeAttr('data-x-vc-hidden-post');
        StorageHelper.removeLocal(`fi${feedItemId}`);
        StorageHelper.getLocal('totalFi').then(totalHiddenItems => {
            let storageData = {};
            storageData['totalFi'] = --totalHiddenItems;
            StorageHelper.setLocal(storageData);
        })
    });
}

function hideFeedItem({ $feedItem, feedItemId, useAnimation }) {
    let addHiddenPostAttr = () => $feedItem.attr('data-x-vc-hidden-post', feedItemId);
    useAnimation === true 
        ? $feedItem.fadeOut(function () { addHiddenPostAttr() }) 
        : addHiddenPostAttr();
}

function closeHiddenItemsDialog() {
    $('.x-vc-dialog').remove();
}

function getFeedItemId($feedItem) {
    return $feedItem.find('.content-feed').attr('data-content-id');
}

function getFeedItemTitle($feedItem) {
    return $feedItem.find('.content-title').text().trim();
}

function truncateString(str, maxLen) {
    return str.substring(0, Math.min(maxLen, str.length));
}

function postMonitor() {
    setTimeout(() => {
        new Promise(resolve => {
            let $feedItems = getFeedItemsWithoutXButton();
            if ($feedItems.length > 0) {
                $feedItems.each(function () {
                    let $fi = $(this);
                    let id = getFeedItemId($fi);
                    StorageHelper.getLocal(`fi${id}`).then(value => {
                        if (value) {
                            hideFeedItem({ $feedItem: $fi, feedItemId: id });
                        }
                    })
                })
                injectHideFeedItemBtn();
            }
            resolve();
        }).then(() => postMonitor());
    }, 1000);
}

function injectHideFeedItemBtn() {
    getFeedItemsWithoutXButton().each(function () {
        $(this)
            .attr('data-x-vc-feed-item', '')
            .find('.content-header__item--controls')
            .prepend(buildHideBtn());
    });
}

function getFeedItemsWithoutXButton() {
    return $('.feed__item:not([data-x-vc-feed-item])')
}

function buildHideBtn() {
    return $(`<button class="x-vc-rm-item-btn ${YA_METRIKA_DISABLE_CLICKMAP_CLASS}">&times;</button>`)
}