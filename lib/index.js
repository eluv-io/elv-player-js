import EluvioPlayerParameters, {DefaultParameters} from "./PlayerParameters.js";
import MergeWith from "lodash/mergeWith.js";
import Clone from "lodash/cloneDeep.js";

class EluvioPlayerWrapper {
  constructor(target, parameters) {
    this.Initialize(
      target,
      MergeWith(
        Clone(DefaultParameters),
        parameters
      )
    );
  }

  async Initialize(target, parameters) {
    target.innerHTML = "";

    switch(parameters.playerOptions.ui) {
      case "tv":
        throw "TV UI not implemented yet";
      default:
        (await import ("./ui/Web.jsx")).default(target, parameters);
        break;
    }
  }
}

EluvioPlayerWrapper.EluvioPlayerParameters = EluvioPlayerParameters;

export {
  EluvioPlayerWrapper as EluvioPlayer,
  EluvioPlayerParameters
};

export default EluvioPlayerWrapper;
