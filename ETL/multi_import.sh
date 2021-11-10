cd data/
  arr=(*)
  len=${#arr[@]}
  each=$(($len/8))
  for i in $( eval echo {0..7} );
    do ( ../tick_import.sh ${arr[@]:$i*$each:$each} &)
  done
exit
