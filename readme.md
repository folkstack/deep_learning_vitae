This repo documents my vectors in machine learning. 

[Various](https://github.com/folkstack/various) is my library of utils, neural networks, and experiments, using TensorFlow base operations (no frameworks). Examples: [CNN layers](https://github.com/folkstack/various/blob/master/topo.js#L84); [RNN layers](https://github.com/folkstack/various/blob/master/topo.js#L17); [Game of Life](https://github.com/NHQ/various/blob/iir/utils.js#L260) in SGD-able tensorflow matrix operations; experimental [Neural Infinite Impluse Response Network](https://github.com/NHQ/various/blob/iir/topo.js#L10) made out of RNNs. 

[MNIST10k](https://github.com/folkstack/mnist10k) uses the CNNs and dense networks from "various" to solve MNIST in the form of a Variational Auto-Encoder, also used in reverse to generate digits for visual verification. The NN is implemented [here](https://github.com/folkstack/mnist10k/blob/master/app.js#L15), demostrating the array-based, layering API in "Various" (see above).  

[NaivETL](/ETL) - I needed to query and format financial data from multiple source on the web to put into a "Temporal Fusion Transformer" ([link](https://github.com/folkstack/deep_learning_vitae)); this time I did not write the NN, and so had to fit the data perfectly into an obscure framework.  The job is split into processes, with shell and Node.js scripts.  It is a demostration of scalable, low-level devops.  Data is stored in files, transformed via scrpts and SQL. 

[TRX](trx.js) is a transformer neural network and ETL for the numerai data science challenge.  It has several options for how to collate and filter the training batches by statistical properties, matching it to degrees with the current "live" data.  Data is stored and queried in SQLite.

[Video Batch Streamer](videobs.js) shells out to ffmpeg to render videos by pixel format, resolution, size, and framerate; then formats the raw output into tensorflow batch matrices.

[Boltzmann Machines](https://github.com/folkstack/distributed_training_boltzmann_machines) - Theoretical Artifical Neurology.


### Algorithms and Generative Modeling

I model audio algorithms, and I build algorithm tuning interfaces, or instruments.  

An early example of manual modeling, [steel algorithms](https://soundcloud.com/folkstack/steel-algorithms), in which the steel drum is artificial, produced by oscillating the mean value of the distribution of frequencies, among other tricks.  

Another example, which is an evolution of "Steel" algorithms, and builds upon it a modular web and midi interface for most of the parameters: [G-Tone](http://github.com/folkstack/g-tone).  

That algorithm is capable of producing an vast variety of sounds; I could implement it in matrix ops and use gradient descent to reverse engineer real instruments and natural sounds (i.e. find their parameters).  For which see reverse-fitting amplitudes [a la mode bezier curves](https://nhq.github.io/beezy/public/).  

I have many more apps, projects, and examples in audio and music algorithms.
