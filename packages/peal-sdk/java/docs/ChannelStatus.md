

# ChannelStatus

## anyOf schemas
* [ChannelStatusAnyOf](ChannelStatusAnyOf.md)
* [ChannelStatusAnyOf1](ChannelStatusAnyOf1.md)
* [ChannelStatusAnyOf2](ChannelStatusAnyOf2.md)

## Example
```java
// Import classes:
import social.peal.model.ChannelStatus;
import social.peal.model.ChannelStatusAnyOf;
import social.peal.model.ChannelStatusAnyOf1;
import social.peal.model.ChannelStatusAnyOf2;

public class Example {
    public static void main(String[] args) {
        ChannelStatus exampleChannelStatus = new ChannelStatus();

        // create a new ChannelStatusAnyOf
        ChannelStatusAnyOf exampleChannelStatusAnyOf = new ChannelStatusAnyOf();
        // set ChannelStatus to ChannelStatusAnyOf
        exampleChannelStatus.setActualInstance(exampleChannelStatusAnyOf);
        // to get back the ChannelStatusAnyOf set earlier
        ChannelStatusAnyOf testChannelStatusAnyOf = (ChannelStatusAnyOf) exampleChannelStatus.getActualInstance();

        // create a new ChannelStatusAnyOf1
        ChannelStatusAnyOf1 exampleChannelStatusAnyOf1 = new ChannelStatusAnyOf1();
        // set ChannelStatus to ChannelStatusAnyOf1
        exampleChannelStatus.setActualInstance(exampleChannelStatusAnyOf1);
        // to get back the ChannelStatusAnyOf1 set earlier
        ChannelStatusAnyOf1 testChannelStatusAnyOf1 = (ChannelStatusAnyOf1) exampleChannelStatus.getActualInstance();

        // create a new ChannelStatusAnyOf2
        ChannelStatusAnyOf2 exampleChannelStatusAnyOf2 = new ChannelStatusAnyOf2();
        // set ChannelStatus to ChannelStatusAnyOf2
        exampleChannelStatus.setActualInstance(exampleChannelStatusAnyOf2);
        // to get back the ChannelStatusAnyOf2 set earlier
        ChannelStatusAnyOf2 testChannelStatusAnyOf2 = (ChannelStatusAnyOf2) exampleChannelStatus.getActualInstance();
    }
}
```


