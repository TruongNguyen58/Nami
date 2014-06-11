function add(arr, value) {
	for (var i=0; i < arr.length; i++) {
		if (arr[i] === value) {
			return;
		}
	}
	arr.push(value)
}
exports.add = add

function sort (arr, property, desc){
  function sorter(aa,bb){
    var a = !desc ? aa : bb;
    var b = !desc ? bb : aa;
      
    if (typeof a[property] == "number") {
      return (a[property] - b[property]);
    } else {
      return ((a[property] < b[property]) ? -1 : ((a[property] > b[property]) ? 1 : 0));
    }
  }
  return arr.sort(sorter);
};

exports.sort = sort

function sortByObjectValue(object) {
  var sortable = [];
  for (var key in object)
      sortable.push([key, object[key]])
  sortable.sort(function(a, b) {return b[1] - a[1]})
  return sortable;
}

exports.sortByObjectValue = sortByObjectValue

function getObjectKeyIndex(obj, keyToFind) {
    var i = 0, key;
    for (key in obj) {
        if (key == keyToFind) {
            return i;
        }
        i++;
    }
    return null;
}

exports.getObjectKeyIndex = getObjectKeyIndex

