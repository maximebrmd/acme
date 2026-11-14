<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxActionUnavailableEncoded extends JsonSerializableType
{
    /**
     * @var value-of<InboxActionUnavailableEncodedTag> $tag
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
     * @var string $ability
     */
    #[JsonProperty('ability')]
    public string $ability;

    /**
     * @var value-of<InboxActionUnavailableEncodedStanding> $standing
     */
    #[JsonProperty('standing')]
    public string $standing;

    /**
     * @param array{
     *   tag: value-of<InboxActionUnavailableEncodedTag>,
     *   ability: string,
     *   standing: value-of<InboxActionUnavailableEncodedStanding>,
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
        $this->ability = $values['ability'];
        $this->standing = $values['standing'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
