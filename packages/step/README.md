# @faasjs/workflow-step

The step component in FaasJS/Workflow.

## Step's Status

### draft

When you initiate a new step, its status is `draft`. You can only modify the data of step in this status.

### done

Done means the step is completed. You can only read the data of step in this status.

### hanging

Hanging means that the step is waiting for some reason to complete.

Deference between `hanging` and `draft` is that hanging means user knows the step is waiting for something, but draft means user doesn't know the step is waiting for something.

### locked

Locked means that the step is waiting for some reason to complete, and the step is locked, which means that the step cannot be modified.

If you want to modify the step, you need to unlock it first.

### canceled

Canceled means that the step is canceled.
