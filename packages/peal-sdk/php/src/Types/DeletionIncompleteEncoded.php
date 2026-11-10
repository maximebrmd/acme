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
     * @var ?string $code
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var ?string $message
     */
    #[JsonProperty('message')]
    public ?string $message;

    /**
     * @var ?string $requestId
     */
    #[JsonProperty('requestId')]
    public ?string $requestId;

    /**
     * @var int $subscriptionsCancelled
     */
    #[JsonProperty('subscriptionsCancelled')]
    public int $subscriptionsCancelled;

    /**
     * @param array{
     *   tag: value-of<DeletionIncompleteEncodedTag>,
     *   subscriptionsCancelled: int,
     *   code?: ?string,
     *   message?: ?string,
     *   requestId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->code = $values['code'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
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
