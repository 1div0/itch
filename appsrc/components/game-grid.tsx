
import * as React from "react";
import {connect} from "./connect";
import {createStructuredSelector} from "reselect";
import Fuse = require("fuse.js");

import {filter, uniq, map} from "underscore";

import * as actions from "../actions";

import isPlatformCompatible from "../util/is-platform-compatible";

import Icon from "./icon";
import HubItem from "./hub-item";

import {IState, IGameRecord, IFilteredGameRecord} from "../types";
import {IAction, dispatcher} from "../constants/action-types";
import {ILocalizer} from "../localizer";

import Dimensions = require("react-dimensions");
import {Grid} from "react-virtualized";

interface ICellInfo {
  columnIndex: number;
  key: string;
  rowIndex: number;
  style: React.CSSProperties;
}

interface ILayoutInfo {
  columnCount: number;
  filteredGames: IFilteredGameRecord[];
}

class GameGrid extends React.Component<IGameGridProps, void> {
  fuse: Fuse<IGameRecord>;

  constructor () {
    super();
    this.fuse = new Fuse([], {
      keys: [
        { name: "title", weight: 0.8 },
        { name: "shortText", weight: 0.4 },
      ],
      threshold: 0.5,
      include: ["score"],
    });
    this.cellRenderer = this.cellRenderer.bind(this);
  }

  render () {
    const {t, games, filterQuery = "", onlyCompatible, tab, clearFilters} = this.props;

    let uniqueGames = games;

    // corner case: if an invalid download key slips in, it may not be associated
    // with a game — just keep displaying it instead of breaking the whole app,
    // cf. https://itch.io/post/73405
    uniqueGames = filter(uniqueGames, (game) => !!game);

    // if you own a game multiple times, it might appear multiple times in the grid
    uniqueGames = uniq(uniqueGames, (game) => game.id);

    let filteredGames: IFilteredGameRecord[];
    if (filterQuery.length > 0) {
      this.fuse.set(uniqueGames);
      const results = this.fuse.search(filterQuery);
      filteredGames = map(results, (result): IFilteredGameRecord => ({
        game: result.item,
        searchScore: result.score,
      }));
    } else {
      filteredGames = map(uniqueGames, (game): IFilteredGameRecord => ({
        game,
      }));
    }
    let hiddenCount = 0;

    if (onlyCompatible) {
      filteredGames = filter(filteredGames, (record) => isPlatformCompatible(record.game));
    }

    hiddenCount = uniqueGames.length - filteredGames.length;

    const columnCount = Math.floor(this.props.containerWidth / 280);
    const rowCount = Math.ceil(filteredGames.length / columnCount);
    const columnWidth = ((this.props.containerWidth - 10) / columnCount);
    const rowHeight = columnWidth * 1.12;

    let gridHeight = this.props.containerHeight;
    if (hiddenCount > 0) {
      gridHeight -= 48;
    }

    return <div className="hub-game-grid">
      <Grid
        ref="grid"
        cellRenderer={this.cellRenderer.bind(this, {filteredGames, columnCount})}
        width={this.props.containerWidth}
        height={gridHeight}
        columnWidth={columnWidth}
        columnCount={columnCount}
        rowCount={rowCount}
        rowHeight={rowHeight}
        overscanRowCount={2}
      />
      {hiddenCount > 0
      ? <div className="hidden-count">
        {t("grid.hidden_count", {count: hiddenCount})}
        {" "}
        <span className="clear-filters hint--top" data-hint={t("grid.clear_filters")}
            onClick={() => clearFilters({tab})}>
          <Icon icon="delete"/>
        </span>
      </div>
      : ""}
    </div>;
  }

  cellRenderer(layout: ILayoutInfo, cell: ICellInfo): JSX.Element {
    const gameIndex = (cell.rowIndex * layout.columnCount) + cell.columnIndex;
    const record = layout.filteredGames[gameIndex];

    const style = cell.style;
    style.padding = "10px";
    if (cell.columnIndex < layout.columnCount - 1) {
      style.marginRight = "10px";
    }

    return <div key={cell.key} style={cell.style}>
      {
        record
        ? <HubItem key={`game-${record.game.id}`} game={record.game} searchScore={record.searchScore}/>
        : null
      }
    </div>;
  }
}

interface IGameGridProps {
  // specified
  games: IGameRecord[];
  tab: string;

  filterQuery: string;
  onlyCompatible: boolean;

  t: ILocalizer;

  containerWidth: number;
  containerHeight: number;

  clearFilters: typeof actions.clearFilters;
}

const mapStateToProps = (initialState: IState, props: IGameGridProps) => {
  const {tab} = props;

  return createStructuredSelector({
    filterQuery: (state: IState) => state.session.navigation.filters[tab],
    onlyCompatible: (state: IState) => state.session.navigation.binaryFilters.onlyCompatible,
  });
};

const mapDispatchToProps = (dispatch: (action: IAction<any>) => void) => ({
  clearFilters: dispatcher(dispatch, actions.clearFilters),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Dimensions({elementResize: true})(GameGrid));
