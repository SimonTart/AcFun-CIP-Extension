import * as $ from 'jquery';
import compareVersions from 'compare-versions';
import 'arrive'
import * as manifest from './manifest.json';


function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

function hasComments(): Boolean {
    return $('.comment-area').length > 0;
}

function addMagicButton(): void {
    $('.comment-content:contains(\'该评论已被删除\')').each((_, element) => {
        $(element)
            .filter((_, el) => el.textContent && el.textContent.trim() === '该评论已被删除')
            .filter((_, el) => $(el).find('input').length === 0)
            .append($('<input data-magic type="button" value="施法">'))
    });
}

function coverUser(): void {
    $('.comment-name-bar .name[href*="/u/0.aspx"]')
    .filter((_, el) =>　$(el).parent().find('.name[data-type="cover"]').length === 0)
    .each((_, el) => {
        const $name = $(el);
        const $coverName = $name.clone().attr('data-type', 'cover');
        $name.hide();
        $name.parent().append($coverName);
    });
}

function init() {
    console.log('AcFun CIP Init');
    addMagicButton();
    coverUser();
}

// 关闭升级提示
$(document.body).delegate('[data-id="not-show-update-tip"]', 'click', () => {
    window.localStorage.setItem('notShowUpdateTip', '1');
    $('[data-id="upgrade-tip"]').remove();
});

if (hasComments()) {
    const body: any = document.body
    const debounceInit = debounce(init, 1000, false);;
    body.arrive('#area-comment-inner', { existing: true, onceOnly: true }, () => {
        const comment = document.getElementById('area-comment-inner');
        const config = { attributes: true, childList: true, subtree: true };
        const observer = new MutationObserver(function(mutationsList) {
            for (let mutation of mutationsList) {
                if (mutation.addedNodes.length > 0) {
                    for (const el of Array.from(mutation.addedNodes)) {
                        const classList = (el as Element).classList;
                        if (classList && classList.contains('comment-item')) {
                            debounceInit();
                            return;
                        }
                    }
                }
            }
        });

        // Start observing the target node for configured mutations
        observer.observe(comment, config);
    });

    $('.comment-area').delegate('input[data-magic]', 'click', function () {
        const $itemComment = $(this).closest('.comment-item');
        const contentId = window.location.pathname.split('/ac')[1];
        const count = $itemComment.find('> .comment-name-bar .comment-floor').text().split('#')[1];

        $(this).val('施法中...')
        $.ajax({
            method: 'get',
            url: 'http://api.acfun.trisolar.top/v2/comment',
            // url: 'http://localhost:8000/v2/comment',
            dataType: 'json',
            data: {
                content_id: contentId,
                count,
            },
        })
        .then((res) => {
            let content = res.content;
            const notShowUpdateTip = window.localStorage.getItem('notShowUpdateTip');
            if (!notShowUpdateTip && res.needUpdateVersion && compareVersions(res.needUpdateVersion, (<any>manifest).version) >= 0) {
                content += res.updateTip;
            }

            // 设置内容
            if ($(this).closest('.comment-content').length > 0) {
                $(this).closest('.comment-content').html(content);
            } else {
                $(this).prev('.comment-content').html(content);
            }

            // 移除不必要的
            $(this).remove();

            if (res.userId !== -1) {
                $.ajax({
                    url: 'http://www.acfun.cn/u/profile.aspx',
                    method: 'get',
                    data: {
                        userId: res.userId
                    }
                })
                .then((res) => {
                    if (res.code !== 200) {
                        return;
                    }
                    // 移除不必要的
                    $itemComment.find('> .comment-name-bar .name[data-type="cover"]').remove();

                    // 设置用户名
                    const $name = $itemComment.find('> .comment-name-bar .name')
                    const href = $name.attr('href').replace('0.aspx', res.result.userId + '.aspx');
                    $name.attr('data-uid',  res.result.userId).attr('href', href).text(res.result.username).show();

                    //@todo 显示时间
                    // $itemComment.children('.author-comment:has(.time_)').css('visibility', 'visible');
                })
            }
        })
        .catch((err) => {
            console.log(err)
            $(this).val('施法失败');
        })
    });
}