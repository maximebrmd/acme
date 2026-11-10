<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TooManyRequestsEncoded extends JsonSerializableType
{
    /**
     * @var value-of<TooManyRequestsEncodedTag> $tag
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
     * @var int $limit
     */
    #[JsonProperty('limit')]
    public int $limit;

    /**
     * @var int $retryAfterSeconds
     */
    #[JsonProperty('retryAfterSeconds')]
    public int $retryAfterSeconds;

    /**
     * @var int $windowSeconds
     */
    #[JsonProperty('windowSeconds')]
    public int $windowSeconds;

    /**
     * @param array{
     *   tag: value-of<TooManyRequestsEncodedTag>,
     *   limit: int,
     *   retryAfterSeconds: int,
     *   windowSeconds: int,
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
        $this->limit = $values['limit'];
        $this->retryAfterSeconds = $values['retryAfterSeconds'];
        $this->windowSeconds = $values['windowSeconds'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
