# This repo documents my vectors in machine learning. 

## Various
[Various](https://github.com/folkstack/various) is my library of utils, neural networks, and experiments, using TensorFlow base operations (no frameworks). Examples: [CNN layers](https://github.com/folkstack/various/blob/master/topo.js#L84); [RNN layers](https://github.com/folkstack/various/blob/master/topo.js#L17); [Game of Life](https://github.com/NHQ/various/blob/iir/utils.js#L260) in SGD-able tensorflow matrix operations; experimental [Neural Infinite Impluse Response Network](https://github.com/NHQ/various/blob/iir/topo.js#L10) made out of RNNs. 

## MNIST10K
[MNIST10k](https://github.com/folkstack/mnist10k) uses the CNNs and dense networks from "Various" (above) to solve MNIST in the form of a CNN Variational Auto-Encoder, also used in reverse to generate digits for visual verification. The NN is implemented [here](https://github.com/folkstack/mnist10k/blob/master/app.js#L15), demostrating the array-based, layering API in "Various" (see above).  

## TRX
[TRX](trx.js) is a bespoke transformer neural network and ETL for the numerai data science challenge.  It has several options for how to correlate and filter the training batches by statistical properties, matching it to degrees with the current data.

## NaivETL
[NaivETL](/ETL) - I needed to query and format financial data from multiple source on the web to put into a "Temporal Fusion Transformer" ([link](https://github.com/folkstack/deep_learning_vitae)); this time I did not write the NN, and so had to fit the data perfectly into an obscure framework.  The job is split into processes, with shell and Node.js scripts.  It is a demostration of scalable, low-level devops.  Data is stored in files, transformed via scrpts and SQL. 

## Video Batch Streamer
[Video Batch Streamer](videobs.js) shells out to ffmpeg to render videos by pixel format, resolution, size, and framerate; then formats the raw output into tensorflow batch matrices.

## Distributed Neural Modeling
[Boltzmann Machines](https://github.com/folkstack/distributed_training_boltzmann_machines) - Actual Theoretical Artifical Neurology.  Proof of the parallelizable nature of energy networks.

# Algorithms and Generative Modeling

An early example of "manuel" modeling, [steel algorithms](https://soundcloud.com/folkstack/steel-algorithms), in which the steel drum is artificially produced by oscillating the mean value of the distribution of frequencies, among other tricks.  

Another example, a synthesizer with a modular web and midi interface for most of the algorithm parameters: [G-Tone](http://github.com/folkstack/g-tone).  
The above algorithm is capable of producing a variety of sounds; it could be implemented in matrix ops and use gradient descent to reverse engineer real instruments and natural sounds (i.e. find their parameters).  As an example of this, reverse-fitting amplitudes [a la bezier curves](https://nhq.github.io/beezy/public/).  

I have many more apps, projects, and examples in audio and music algorithms, including whole systems, timings, executions, a bit of theory, a lot of web audio. 
