

# TargetConfirmation

## anyOf schemas
* [TargetConfirmationAnyOf](TargetConfirmationAnyOf.md)
* [TargetConfirmationAnyOf1](TargetConfirmationAnyOf1.md)

## Example
```java
// Import classes:
import social.peal.model.TargetConfirmation;
import social.peal.model.TargetConfirmationAnyOf;
import social.peal.model.TargetConfirmationAnyOf1;

public class Example {
    public static void main(String[] args) {
        TargetConfirmation exampleTargetConfirmation = new TargetConfirmation();

        // create a new TargetConfirmationAnyOf
        TargetConfirmationAnyOf exampleTargetConfirmationAnyOf = new TargetConfirmationAnyOf();
        // set TargetConfirmation to TargetConfirmationAnyOf
        exampleTargetConfirmation.setActualInstance(exampleTargetConfirmationAnyOf);
        // to get back the TargetConfirmationAnyOf set earlier
        TargetConfirmationAnyOf testTargetConfirmationAnyOf = (TargetConfirmationAnyOf) exampleTargetConfirmation.getActualInstance();

        // create a new TargetConfirmationAnyOf1
        TargetConfirmationAnyOf1 exampleTargetConfirmationAnyOf1 = new TargetConfirmationAnyOf1();
        // set TargetConfirmation to TargetConfirmationAnyOf1
        exampleTargetConfirmation.setActualInstance(exampleTargetConfirmationAnyOf1);
        // to get back the TargetConfirmationAnyOf1 set earlier
        TargetConfirmationAnyOf1 testTargetConfirmationAnyOf1 = (TargetConfirmationAnyOf1) exampleTargetConfirmation.getActualInstance();
    }
}
```


