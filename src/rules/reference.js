/**
 * The reference is meant to be used alongside match rule, this should be added to the original field.
 * This rule watches the target field and if the field is not empty fires a change event on the target element
 *
 * @param  {Object} element
 * @param  {String} attribute
 * @return {Object}
 */
export default function (element, attribute) {
  return new Promise((resolve, reject) => {
    let target = document.querySelector(element.getAttribute(attribute));

    if (target.value.length) {
      target.dispatchEvent(new Event('change', {bubbles: true}));
    }

    resolve();
  });
}
