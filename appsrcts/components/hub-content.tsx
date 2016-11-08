
import * as React from "react";
import {connect} from "./connect";

import * as actions from "../actions";

import HubBread from "./hub-bread";
import HubMeat from "./hub-meat";

let FIRST_EVER_RENDER = true;

import {IState, ICredentials} from "../types";
import {ILocalizer} from "../localizer";
import {IAction, dispatcher} from "../constants/action-types";

export class HubContent extends React.Component<IHubContentProps, void> {
  render () {
    if (FIRST_EVER_RENDER) {
      FIRST_EVER_RENDER = false;
      // ooh, dispatching actions from render method, bad!
      // come at me redux zealots I'm awaitin'
      this.props.firstUsefulPage();
    }

    if (!this.props.credentials) {
      return <div/>;
    }

    return <div className="hub-content">
      <HubBread/>
      <HubMeat/>
    </div>;
  }
}

interface IHubContentProps {
  credentials: ICredentials;

  t: ILocalizer;

  firstUsefulPage: typeof actions.firstUsefulPage;
}

const mapStateToProps = (state: IState) => ({
  credentials: state.session.credentials,
});

const mapDispatchToProps = (dispatch: (action: IAction<any>) => void) => ({
  firstUsefulPage: dispatcher(dispatch, actions.firstUsefulPage),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HubContent);
