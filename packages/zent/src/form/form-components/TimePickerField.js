import React, { Component } from 'react';
import TimePicker from 'datetimepicker/TimePicker';
import omit from 'lodash/omit';

import getControlGroup from '../getControlGroup';
import unknownProps from '../unknownProps';

class TimePickerWrap extends Component {
  render() {
    const passableProps = omit(this.props, unknownProps);
    return <TimePicker {...passableProps} />;
  }
}
const TimePickerField = getControlGroup(TimePickerWrap);

export default TimePickerField;
