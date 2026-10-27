import { sanitizeTipTapHtml } from '../src/utils/sanitize-html'

describe('sanitizeTipTapHtml', () => {
  it('drops editor-only markup but keeps links and checked tasks', () => {
    const out = sanitizeTipTapHtml(
      '<p class="x"><strong>Bold</strong> <a href="https://a.com?x=1&amp;y=2" target="_blank">link</a></p>' +
        '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">done</li></ul>',
    )
    expect(out).toContain('<b>Bold</b>')
    expect(out).toContain('<a href="https://a.com?x=1&y=2">link</a>')
    expect(out).toContain('<li checked>done')
    expect(out).not.toContain('class=')
  })
})
