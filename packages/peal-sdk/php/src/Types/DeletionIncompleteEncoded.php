<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class DeletionIncompleteEncoded extends JsonSerializableType
{
    /**
     * @var value-of<DeletionIncompleteEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var int $subscriptionsCancelled
     */
    #[JsonProperty('subscriptionsCancelled')]
    public int $subscriptionsCancelled;

    /**
     * @param array{
     *   tag: value-of<DeletionIncompleteEncodedTag>,
     *   subscriptionsCancelled: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->subscriptionsCancelled = $values['subscriptionsCancelled'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
