<?php

namespace Peal\InboxRules\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class CommentRuleChange extends JsonSerializableType
{
    /**
     * @var ?array<string> $keywords
     */
    #[JsonProperty('keywords'), ArrayType(['string'])]
    public ?array $keywords;

    /**
     * @var ?bool $paused
     */
    #[JsonProperty('paused')]
    public ?bool $paused;

    /**
     * @var ?string $reply
     */
    #[JsonProperty('reply')]
    public ?string $reply;

    /**
     * @param array{
     *   keywords?: ?array<string>,
     *   paused?: ?bool,
     *   reply?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->keywords = $values['keywords'] ?? null;
        $this->paused = $values['paused'] ?? null;
        $this->reply = $values['reply'] ?? null;
    }
}
