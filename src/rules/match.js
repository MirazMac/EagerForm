export default function (element, attribute) {
  return new Promise((resolve, reject) => {
    if (
      element.value ===
      document.querySelector(element.getAttribute(attribute)).value
    ) {
      resolve();
    } else {
      reject("The values don't match");
    }
  });
}
