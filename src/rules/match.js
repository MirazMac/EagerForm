export default function (element, attribute) {
  let msg = this.translate("valueNotEqual");
  
  return new Promise((resolve, reject) => {
    if (
      element.value ===
      document.querySelector(element.getAttribute(attribute)).value
    ) {
      resolve();
    } else {
      reject(msg);
    }
  });
}
