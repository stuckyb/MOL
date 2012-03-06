#!/usr/bin/perl -w

use strict;
use warnings;

use v5.010;

use Statistics::Descriptive;

my @task_categories = (
    qr/^Skipping feature #\d+: the upload index shows that it has already been uploaded\.$/,
    qr/^Batch-transmitting 100 SQL statements to CartoDB\.$/,
    qr/^Batch-transmitting 50 SQL statements to CartoDB\.$/,
    qr/^Processing shapefile: .*$/,
    qr/^Preparing SQL for feature #\d+$/,
    qr/^Result: {.*}$/
);

my %times;

my $last_time = 0;
my $last_task = "Initialization";
while(<>) {
    if(/^\w+:\w+:(\d+):\s*(.*)$/) {
        my $task = $2;
        my $time = $1;
        my $time_taken = ($time - $last_time)/1000;

        my $completed_task = $last_task;
        my $task_class = undef;
        foreach my $re (@task_categories) {
            if($completed_task =~ $re) {
                $task_class = $re;
                last;
            }
        }

        $task_class = "Other" unless defined $task_class;
        
        $times{$task_class} = [] if not exists $times{$task_class};
        push @{$times{$task_class}}, $time_taken;

        # say "Task <<$completed_task>> took <<$time_taken>> seconds.";
        # say "\t(last_time = $last_time)";

        $last_task = $task;
        $last_time = $time;
    } else {
        die "Unable to interpret line <<$_>>";
    }
}

my $total_time = $last_time/1000; # in seconds.
my $total_split_time = 0;

foreach my $task_class (sort {scalar(@{$times{$b}}) <=> scalar(@{$times{$a}}) } keys %times) {
    my @data = @{$times{$task_class}};

    my $stats = Statistics::Descriptive::Full->new();
    $stats->add_data(@data);

    say "Task class $task_class:";
    say "\tn = " . $stats->count();
    say "\trange: " . $stats->min() . "s to " . $stats->max() . "s";
    say "\ttotal: " . $stats->sum() . " seconds.";
    $total_split_time += $stats->sum();

    say "";
    say "\tmean = " . $stats->mean() . " seconds.";
    say "\tstdev = " . $stats->standard_deviation() . " seconds.";

    say "\n";
}

say "Total time taken: $total_time; as per split, $total_split_time (these two numbers should be identical)";
