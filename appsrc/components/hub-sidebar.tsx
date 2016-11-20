
import * as React from "react";
import * as moment from "moment";
import {connect} from "./connect";
import {map, where, debounce} from "underscore";
import * as classNames from "classnames";
import {createSelector, createStructuredSelector} from "reselect";

import * as actions from "../actions";
import defaultImages from "../constants/default-images";
import urls from "../constants/urls";
import {pathToIcon, makeLabel} from "../util/navigation";

import {app} from "../electron";

import Icon from "./icon";
import Dropdown from "./dropdown";

import HubSidebarItem from "./hub-sidebar-item";

import {IState, IUserRecord, IGameRecord, ITabDataSet, ILocalizedString} from "../types";
import {ILocalizer} from "../localizer";
import {IAction, dispatcher} from "../constants/action-types";

import watching, {Watcher} from "./watching";

export function versionString () {
  return `itch v${app.getVersion()}`;
}

@watching
export class HubSidebar extends React.Component<IHubSidebarProps, void> {
  refs: {
    search: HTMLInputElement;
  };

  constructor () {
    super();
    this.triggerSearch = debounce(this.triggerSearch.bind(this), 100);
    this.onSearchKeyUp = this.onSearchKeyUp.bind(this);
    this.onSearchKeyDown = this.onSearchKeyDown.bind(this);
    this.onSearchChange = this.onSearchChange.bind(this);
    this.onSearchFocus = this.onSearchFocus.bind(this);
    this.onSearchBlur = debounce(this.onSearchBlur.bind(this), 200);
  }

  subscribe (watcher: Watcher) {
    watcher.on(actions.focusSearch, async (store, action) => {
      const {search} = this.refs;
      if (search) {
        search.focus();
        search.select();
      }
    });

    watcher.on(actions.closeSearch, async (store, action) => {
      const {search} = this.refs;
      if (search) {
        search.blur();
      }
    });

    watcher.on(actions.triggerBack, async (store, action) => {
      const {search} = this.refs;
      if (search) {
        search.blur();
      }
    });
  }

  render () {
    const {t, osx, sidebarWidth, fullscreen, id: currentId, tabs, tabData,
      navigate, counts, progresses, sublabels, closeTab, closeAllTabs, moveTab,
      openTabContextMenu, newTab, searchLoading, halloween} = this.props;
    const classes = classNames("hub-sidebar", {osx, fullscreen});
    const sidebarStyle = {
      width: sidebarWidth + "px",
    };
    const searchClasses = classNames("search", {loading: searchLoading});

    return <div className={classes} style={sidebarStyle}>
      <div className="title-bar-padder"/>

      <div className="logo hint--bottom" onClick={() => navigate("featured")} data-hint={versionString()}>
        <img src={`static/images/logos/app-${halloween ? "halloween" : "white"}.svg`}/>
      </div>

      <section className={searchClasses}>
        <input id="search" ref="search" type="search"
          placeholder={t("search.placeholder")}
          onKeyDown={this.onSearchKeyDown}
          onKeyUp={this.onSearchKeyUp}
          onChange={this.onSearchChange}
          onFocus={this.onSearchFocus}
          onBlur={this.onSearchBlur}/>
        <span className="icon icon-search"/>
      </section>

      <div className="sidebar-items">
        <h2>
          <span className="label">{t("sidebar.category.basics")}</span>
        </h2>
        {map(tabs.constant, (id, index) => {
          const data = tabData[id] || {};
          const {path} = data;
          const label = makeLabel(id, tabData);
          const icon = pathToIcon(path);
          const active = currentId === id;
          const onClick = () => navigate(id);
          const onContextMenu = () => {
            /* muffin */
          };

          const props = {id, path, label, icon, active, onClick, t, onContextMenu, halloween};
          return <HubSidebarItem {...props}/>;
        })}

        <h2>
          <span className="label">{t("sidebar.category.tabs")}</span>
          <div className="filler"/>
          <span className="action hint--left" data-hint={t("sidebar.close_all_tabs")} onClick={() => closeAllTabs({})}>
            <span className="icon icon-delete"/>
          </span>
        </h2>
        {map(tabs.transient, (id, index) => {
          const data = tabData[id] || {};
          const {path} = data;
          const iconImage = /^url/.test(path) && data.webFavicon;
          const label = makeLabel(id, tabData);
          const icon = pathToIcon(path);
          const active = currentId === id;
          const onClick = () => navigate(id);
          const onClose = () => closeTab({id});
          const onContextMenu = () => openTabContextMenu({id});
          const count = (counts as any)[id];
          const progress = progresses[id];
          const sublabel = sublabels[id];

          let gameOverride: IGameRecord = null;
          if (id === "downloads") {
            gameOverride = this.props.downloadingGame;
          }

          const props = {index, id, path, label, icon, iconImage, active,
            onClick, count, progress, onClose, onContextMenu, moveTab, data, t,
            sublabel, gameOverride, halloween};
          return <HubSidebarItem {...props}/>;
        })}
        <section className="hub-sidebar-item new-tab" onClick={() => newTab({})}>
          <div className="row">
            <span className="symbol icon icon-plus"/>
            <span className="label">{t("sidebar.new_tab")}</span>
            <div className="filler"/>
          </div>
        </section>
      </div>

      <section className="sidebar-blank"/>

      {this.dropdown()}
    </div>;
  }

  onSearchFocus (e: React.FocusEvent<HTMLInputElement>) {
    this.props.focusSearch({});
  }

  onSearchBlur (e: React.FocusEvent<HTMLInputElement>) {
    this.props.closeSearch({});
  }

  onSearchChange (e: React.FormEvent<HTMLInputElement>) {
    this.triggerSearch();
  }

  onSearchKeyDown (e: React.KeyboardEvent<HTMLInputElement>) {
    const {key} = e;

    let passthrough = false;

    if (key === "Escape") {
      // default behavior is to clear - don't
    } else if (key === "ArrowDown") {
      this.props.searchHighlightOffset({offset: 1});
      // default behavior is to jump to end of input - don't
    } else if (key === "ArrowUp") {
      this.props.searchHighlightOffset({offset: -1});
      // default behavior is to jump to start of input - don't
    } else {
      passthrough = true;
    }

    if (!passthrough) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  onSearchKeyUp (e: React.KeyboardEvent<HTMLInputElement>) {
    const {key} = e;

    if (key === "Escape") {
      return;
    } else if (key === "ArrowDown") {
      return;
    } else if (key === "ArrowUp") {
      return;
    } else if (key === "Enter") {
      return;
    }

    this.triggerSearch();
  }

  triggerSearch () {
    const search = this.refs.search;
    if (!search) {
      return;
    }

    this.props.search({query: search.value});
  }

  me () {
    const me = (this.props.me || {}) as IUserRecord;
    const {coverUrl = defaultImages.avatar, username, displayName} = me;

    return <section className="hub-sidebar-item me">
      <img src={coverUrl}/>
      <span className="label">{username || displayName}</span>
      <div className="filler"/>
      <Icon icon="triangle-down" classes={["me-dropdown"]}/>
    </section>;
  }

  dropdown () {
    const {viewCreatorProfile, viewCommunityProfile, changeUser,
      navigate, copyToClipboard, quit, reportIssue,
      openUrl, checkForSelfUpdate} = this.props;

    const items = [
      {
        icon: "rocket",
        label: ["sidebar.view_creator_profile"],
        onClick: viewCreatorProfile,
      },
      {
        icon: "fire",
        label: ["sidebar.view_community_profile"],
        onClick: viewCommunityProfile,
      },
      {
        type: "separator",
      },
      {
        icon: "download",
        label: ["sidebar.downloads"],
        onClick: () => navigate("downloads"),
      },
      {
        icon: "cog",
        label: ["sidebar.preferences"],
        onClick: () => navigate("preferences"),
      },
      {
        type: "separator",
      },
      {
        icon: "checkmark",
        label: versionString(),
        onClick: () => copyToClipboard({text: versionString()}),
        type: "info",
      },
      {
        icon: "repeat",
        label: ["menu.help.check_for_update"],
        onClick: () => checkForSelfUpdate({}),
      },
      {
        icon: "search",
        label: ["menu.help.search_issue"],
        onClick: () => openUrl({url: `${urls.itchRepo}/search?type=Issues`}),
      },
      {
        icon: "bug",
        label: ["menu.help.report_issue"],
        onClick: () => reportIssue({}),
      },
      {
        icon: "lifebuoy",
        label: ["menu.help.help"],
        onClick: () => navigate("url/" + urls.manual),
      },
      {
        type: "separator",
      },
      {
        icon: "shuffle",
        label: ["menu.account.change_user"],
        onClick: changeUser,
      },
      {
        icon: "exit",
        label: ["menu.file.quit"],
        onClick: quit,
      },
    ];
    return <Dropdown items={items} inner={this.me()} updown/>;
  }
}

interface IHubSidebarProps {
  osx: boolean;
  sidebarWidth: number;
  fullscreen: boolean;
  me: IUserRecord;

  id: string;
  path: string;
  tabs: {
    constant: string[];
    transient: string[];
  };
  tabData: ITabDataSet;

  /** number of unread history items, 'unread' downloads, etc. */
  counts: {
    [key: string]: number;
  };

  /** progress of a tab in [0, 1] */
  progresses: {
    [key: string]: number;
  };

  /** secondary label for a tab */
  sublabels: {
    [key: string]: ILocalizedString;
  };

  /** game that's currently downloading, if any */
  downloadingGame?: IGameRecord;

  /** true if we're currently fetching search results */
  searchLoading: boolean;

  /** true if it's halloween */
  halloween: boolean;

  t: ILocalizer;

  viewCreatorProfile: typeof actions.viewCreatorProfile;
  viewCommunityProfile: typeof actions.viewCommunityProfile;
  changeUser: typeof actions.changeUser;
  navigate: typeof actions.navigate;
  closeTab: typeof actions.closeTab;
  closeAllTabs: typeof actions.closeAllTabs;
  moveTab: typeof actions.moveTab;
  openTabContextMenu: typeof actions.openTabContextMenu;
  newTab: typeof actions.newTab;
  copyToClipboard: typeof actions.copyToClipboard;

  focusSearch: typeof actions.focusSearch;
  closeSearch: typeof actions.closeSearch;
  search: typeof actions.search;
  searchHighlightOffset: typeof actions.searchHighlightOffset;
  openUrl: typeof actions.openUrl;
  checkForSelfUpdate: typeof actions.checkForSelfUpdate;
  reportIssue: typeof actions.reportIssue;
  quit: typeof actions.quit;
}

const mapStateToProps = createStructuredSelector({
  osx: (state: IState) => state.system.osx,
  fullscreen: (state: IState) => state.ui.mainWindow.fullscreen,
  sidebarWidth: (state: IState) => state.preferences.sidebarWidth || 240,
  me: (state: IState) => state.session.credentials.me,
  id: (state: IState) => state.session.navigation.id,
  tabs: (state: IState) => state.session.navigation.tabs,
  tabData: (state: IState) => state.session.navigation.tabData,
  searchLoading: (state: IState) => state.session.search.loading,
  halloween: (state: IState) => state.status.bonuses.halloween,

  counts: createSelector(
    (state: IState) => state.history.itemsByDate,
    (state: IState) => state.downloads.finishedDownloads,
    (history, downloads) => ({
      history: where(history, {active: true}).length,
      downloads: downloads.length,
    })
  ),

  downloadingGame: (state: IState) => {
    const {activeDownload} = state.downloads;
    if (activeDownload) {
      return activeDownload.game;
    }
  },

  progresses: (state: IState) => ({
    downloads: state.downloads.progress,
  }),

  sublabels: (state: IState) => {
    const {activeDownload} = state.downloads;
    let label: ILocalizedString = null;
    if (activeDownload && activeDownload.progress > 0) {
      if (state.downloads.downloadsPaused) {
        label = ["grid.item.downloads_paused"];
      } else {
        const title = activeDownload.game.title;
        const duration = moment.duration(activeDownload.eta, "seconds") as any;
        // silly typings, durations have locales!
        const humanDuration = duration.locale(state.i18n.lang).humanize();
        label = `${title} — ${humanDuration}`;
      }
    }

    return {
      downloads: label,
    };
  },
});

const mapDispatchToProps = (dispatch: (action: IAction<any>) => void) => ({
  navigate: dispatcher(dispatch, actions.navigate),
  closeTab: dispatcher(dispatch, actions.closeTab),
  closeAllTabs: dispatcher(dispatch, actions.closeAllTabs),
  moveTab: dispatcher(dispatch, actions.moveTab),

  viewCreatorProfile: dispatcher(dispatch, actions.viewCreatorProfile),
  viewCommunityProfile: dispatcher(dispatch, actions.viewCommunityProfile),
  changeUser: dispatcher(dispatch, actions.changeUser),
  openTabContextMenu: dispatcher(dispatch, actions.openTabContextMenu),
  newTab: dispatcher(dispatch, actions.newTab),
  copyToClipboard: dispatcher(dispatch, actions.copyToClipboard),

  focusSearch: dispatcher(dispatch, actions.focusSearch),
  closeSearch: dispatcher(dispatch, actions.closeSearch),
  search: dispatcher(dispatch, actions.search),

  reportIssue: dispatcher(dispatch, actions.reportIssue),
  openUrl: dispatcher(dispatch, actions.openUrl),

  searchHighlightOffset: dispatcher(dispatch, actions.searchHighlightOffset),

  checkForSelfUpdate: dispatcher(dispatch, actions.checkForSelfUpdate),

  quit: dispatcher(dispatch, actions.quit),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HubSidebar);
