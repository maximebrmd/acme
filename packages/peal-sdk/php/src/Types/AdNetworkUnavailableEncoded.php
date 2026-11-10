<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AdNetworkUnavailableEncoded extends JsonSerializableType
{
    /**
     * @var value-of<AdNetworkUnavailableEncodedTag> $tag
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
     * @var ?int $retryAfterSeconds
     */
    #[JsonProperty('retryAfterSeconds')]
    public ?int $retryAfterSeconds;

    /**
     * @param array{
     *   tag: value-of<AdNetworkUnavailableEncodedTag>,
     *   code?: ?string,
     *   message?: ?string,
     *   requestId?: ?string,
     *   retryAfterSeconds?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->code = $values['code'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
        $this->retryAfterSeconds = $values['retryAfterSeconds'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
