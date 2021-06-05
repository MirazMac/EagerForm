/**
 * Remote rule
 *
 * By default an exact HTTP 200 means the input passed validation, any other codes mean it didn't
 * You can reverse this behaviour by setting the data-eager-remote-reverse="true" attribute like this
 *
 * @param  {Object} element
 * @param  {String} attribute
 * @return {Promise}
 */
export default function (element, attribute) {
  let endpoint = element
    .getAttribute(attribute)
    .replace("{value}", element.value);

  let reverse =
    element.getAttribute(`${attribute}-reverse`) == "true" ? true : false;

  let name = `__remote_request_${element.id}`;

  if (typeof this[name] == "undefined") {
    this[name] = new XMLHttpRequest();
  }

  let options = {
    method: "GET",
    headers: {},
    data: null,
  };

  let customOptions;

  if (element.hasAttribute(`${attribute}-options`)) {
    try {
      customOptions = JSON.parse(element.getAttribute(`${attribute}-options`));
    } catch (err) {}
  }

  if (customOptions) {
    options = { ...options, ...customOptions };
  }

  // Abort pending requests before staring new ones
  if (this[name].readyState > 0 && this[name].readyState < 4) {
    this[name].abort();
  }

  var xhr = this[name];
  xhr.open(options.method, endpoint);

  for (const key in options.headers) {
    xhr.setRequestHeader(key, options.headers[key]);
  }

  var msg = this.translate("remoteInvalid");

  return new Promise((resolve, reject) => {
    xhr.onload = function () {
      let success = this.status == 200;
      if (reverse) {
        success = !success;
      }

      if (success) {
        resolve();
      } else {
        reject(msg);
      }
    };
    xhr.onerror = function () {
      console.log(`${this.status} ${this.statusText}`);
    };
    xhr.send(options.data);
  });
}
