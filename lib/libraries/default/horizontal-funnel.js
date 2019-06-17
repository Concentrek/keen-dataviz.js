import * as d3 from 'd3';
import { textWrap } from '../../utils/svg-text-wrap';
import { prettyNumber } from '../../utils/pretty-number';
import copyToClipboard from '../../utils/copy-to-clipboard';

export default class HorizontalFunnel {
  render() {
    const { matrix } = this.dataset;
    const {
      colors,
      container,
      labelMapping,
      colorMapping,
      utils,
    } = this.config;
    const opts = this.config;
    const {
      percents: {
        show,
        countingMethod,
        decimals,
      },
      lines,
      marginBetweenSteps,
      resultValues,
      hover,
      minimalSize,
    } = this.config.funnel;
    const margin = { top: 20, right: 30, bottom: 100, left: 10 };
    let xMarginElement = 0;
    if(marginBetweenSteps){
      xMarginElement = 5;
    }
    const funnelContainer = d3.select(container);
    const chartContainer = d3.select(this.el().querySelector('.' + this.config.theme + '-rendering .c3-chart'));
    const chart = chartContainer.append('svg');
    const svgWidth = funnelContainer.style('width').slice(0, -2)
          - margin.right - margin.left;
    const svgHeight = funnelContainer.style('height').slice(0, -2)
          - margin.top - margin.bottom - 30;
    const elemWidth= svgWidth/(matrix.length - 1);
    let prevElemHeight = svgHeight;
    let percent = (100).toFixed(decimals);

    // prepare normal funnel polygons
    let minimalSizeStep = 0;
    if(minimalSize){
      minimalSizeStep = (svgHeight - minimalSize) / (matrix.length-2);
    }
    const polygons = matrix.slice(1).map((d, i) => {
        const newPoints = [
          {
            x: elemWidth * i + xMarginElement,
            y: ((svgHeight - prevElemHeight)/2)
          },
          {
            x: elemWidth * i + xMarginElement,
            y: ((svgHeight - prevElemHeight)/2 + prevElemHeight)
          },
        ]
        if(i !== 0){
          if(countingMethod === 'relative'){
            minimalSize
              ? (prevElemHeight = prevElemHeight - minimalSizeStep)
              : prevElemHeight = prevElemHeight * d[1]/matrix[i][1];
            percent = ((d[1]/matrix[i][1])*100).toFixed(decimals);
          }
          if(countingMethod === 'absolute'){
            minimalSize
              ? (prevElemHeight = prevElemHeight - minimalSizeStep)
              : prevElemHeight = svgHeight * d[1]/matrix[1][1];
            percent = ((d[1]/matrix[1][1])*100).toFixed(decimals);
          }
        }
        let label = d[0];
        if(Object.keys(labelMapping).length){
          for (let key in labelMapping) {
            if(labelMapping[key] === d[0]) {
              label = key;
            }
          }
        }
        let result = d[1];
        if ( (typeof opts['prettyNumber'] === 'undefined'
          || opts['prettyNumber'] === true)
          && !isNaN(parseInt(d[1])) ) {
            result = prettyNumber(d[1]);
        }
        return {
          name: d[0],
          label,
          percent: percent + '%',
          result,
          points: [
            ...newPoints,
            {
              x: elemWidth * (i + 1),
              y: ((svgHeight - prevElemHeight)/2 + prevElemHeight)
            },
            {
              x: elemWidth * (i + 1),
              y: ((svgHeight - prevElemHeight)/2)
            }
          ]
        }
    });

    //chart rendering with polygons
    chart
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('viewBox', `0 0 ${svgWidth + margin.left + margin.right} ${svgHeight + margin.top + margin.bottom - 30}`)
      .attr('height', '100%')
      .attr('width', '100%')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
      .selectAll('polygon')
      .data(polygons)
      .enter()
      .append('polygon')
        .attr('points', (d) => {
            return d.points.map((p) => {
              return [p.x,p.y].join(',');
            })
            .join(' ');
        })
        .style('fill', (d, i) => {
          if(colorMapping[d.label]){
            return colorMapping[d.label];
          }
          return colors[i];
        })
        .attr('class', (d) => { return d.label; })
        .attr('cursor', 'pointer');

    if(lines){
      //rendering lines
      chart
        .selectAll('line')
        .data(polygons)
        .enter()
        .append('line')
        .attr('x1', (d) => {
          return d.points[0].x + margin.left - (xMarginElement/2);
        })
        .attr('y1', svgHeight + margin.bottom)
        .attr('x2', (d) => {
          return d.points[0].x + margin.left - (xMarginElement/2);
        })
        .attr('y2', (d) => { return d.points[0].y + margin.top; })
        .attr('class', 'chart-lines');

      //rendering last line
      chart
        .append('line')
        .attr('x1', svgWidth + margin.left - (xMarginElement/2))
        .attr('y1', svgHeight + margin.bottom)
        .attr('x2', polygons[polygons.length-1].points[3].x
                    + margin.left + (xMarginElement/2))
        .attr('y2', polygons[polygons.length-1].points[3].y + margin.top)
        .attr('class', 'chart-lines');
    }

    //rendering labels when lines are visible
    if(lines){
      chart
        .selectAll('text.label')
        .data(polygons)
        .enter()
        .append('text')
        .style('text-anchor', 'middle')
        .attr('x', (d) => {
          return d.points[1].x + (elemWidth/2) + margin.left
        })
        .attr('y', svgHeight + (margin.bottom * 0.5) + margin.top)
        .attr('class', (d) => { return 'text-label ' + d.label; })
        .text((d) => { return d.name; })
        .call(textWrap, elemWidth)
        .attr('cursor', 'pointer');
    }

    //rendering labels when lines are not visible
    if(!lines) {
      chart
        .selectAll('text.label')
        .data(polygons)
        .enter()
        .append('text')
        .style('text-anchor', 'middle')
        .attr('x', (d) => {
          return d.points[1].x + (elemWidth/2) + margin.left
        })
        .attr('y', (d) => {
          if(d.points[2].y + ((d.points[3].y - d.points[0].y)/2)
          + (elemWidth/4) > svgHeight + margin.bottom - 40 + margin.top){
            return svgHeight + margin.bottom - 40 + margin.top;
          }
          return d.points[2].y + ((d.points[3].y - d.points[0].y)/2)
                  + (elemWidth/4) + margin.top;
        })
        .attr('class', (d) => { return 'text-label ' + d.label; })
        .text((d) => { return d.name; })
        .call(textWrap, elemWidth)
        .attr('cursor', 'pointer');
    }

    //rendering percents for each step
    if(show && !resultValues){
      chart
        .selectAll('text.label')
        .data(polygons)
        .enter()
        .append('text')
        .style('text-anchor', 'middle')
        .attr('x', (d) => {
          return d.points[1].x + (elemWidth/2) + margin.left
        })
        .attr('y', svgHeight/2 + margin.top + 10)
        .attr('class', (d) => { return 'text-main ' + d.label; })
        .text((d) => { return d.percent; })
        .attr('cursor', 'pointer');
    }

    //rendering results for each step
    if(resultValues && !show){
      chart
        .selectAll('text.label')
        .data(polygons)
        .enter()
        .append('text')
        .style('text-anchor', 'middle')
        .attr('x', (d) => {
          return d.points[1].x + (elemWidth/2) + margin.left
        })
        .attr('y', svgHeight/2 + margin.top + 10)
        .attr('class', (d) => { return 'text-main ' + d.label; })
        .text((d) => { return d.result; })
        .attr('cursor', 'pointer');
    }

    //rendering results and percenage together
    if(show && resultValues){
      //rendering percents
      chart
        .selectAll('text.label')
        .data(polygons)
        .enter()
        .append('text')
        .style('text-anchor', 'middle')
        .attr('x', (d) => {
          return d.points[1].x + (elemWidth/2) + margin.left
        })
        .attr('y', svgHeight/2 + margin.top + 16)
        .attr('class', (d) => { return 'text-second ' + d.label; })
        .text((d) => { return d.percent; })
        .attr('cursor', 'pointer');

      //rendering results
      chart
        .selectAll('text.label')
        .data(polygons)
        .enter()
        .append('text')
        .style('text-anchor', 'middle')
        .attr('x', (d) => {
          return d.points[1].x + (elemWidth/2) + margin.left
        })
        .attr('y', svgHeight/2+ margin.top - 3)
        .attr('class', (d) => { return 'text-main ' + d.label; })
        .text((d) => { return d.result; })
        .attr('cursor', 'pointer');
    }
    //hover handling
    if(hover){
      const polygonsHover = chart.selectAll('polygon');
      polygonsHover
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

      const labelHover = chart.selectAll('text');
      labelHover
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

      function handleMouseOver(d) {
        polygonsHover
          .style('opacity', 0.5);
        labelHover
          .style('opacity', 0.5);
        const thisLabel = /[^ ]*$/.exec(d3.select(this).attr('class'))[0];
        chart
          .selectAll(`.${thisLabel}`)
          .style('opacity', 1);
      }
      function handleMouseOut(d) {
        polygonsHover
          .style('opacity', 1);
        labelHover
          .style('opacity', 1);
      }
    }

    // click to copy
    if (utils && utils.clickToCopyToClipboard) {
      const label = chart.selectAll('text');

      label.on('click', handleClickToCopy);

      function handleClickToCopy(data) {
        const { percent, result } = data;
        if (resultValues) {
          copyToClipboard(result, d3.event);
        } else if (show) {
          copyToClipboard(percent, d3.event);
        }
      }
    }
  }
  update() {
    this.destroy();
    this.render();
  }
  destroy() {
    const chartContainer = d3.select(this.el().querySelector('.' + this.config.theme + '-rendering .c3-chart'));
    chartContainer.remove();
  }
}
