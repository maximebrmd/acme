<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

/**
 * How a post goes out on an X account. Scheduling needs none of them; `shareWithFollowers` needs `communityId`.
 */
class XOptions extends JsonSerializableType
{
    /**
     * @var ?string $communityId
     */
    #[JsonProperty('communityId')]
    public ?string $communityId;

    /**
     * @var ?bool $madeWithAi
     */
    #[JsonProperty('madeWithAi')]
    public ?bool $madeWithAi;

    /**
     * @var ?bool $paidPartnership
     */
    #[JsonProperty('paidPartnership')]
    public ?bool $paidPartnership;

    /**
     * @var ?value-of<XReplySettings> $replySettings
     */
    #[JsonProperty('replySettings')]
    public ?string $replySettings;

    /**
     * @var ?bool $shareWithFollowers
     */
    #[JsonProperty('shareWithFollowers')]
    public ?bool $shareWithFollowers;

    /**
     * @param array{
     *   communityId?: ?string,
     *   madeWithAi?: ?bool,
     *   paidPartnership?: ?bool,
     *   replySettings?: ?value-of<XReplySettings>,
     *   shareWithFollowers?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->communityId = $values['communityId'] ?? null;
        $this->madeWithAi = $values['madeWithAi'] ?? null;
        $this->paidPartnership = $values['paidPartnership'] ?? null;
        $this->replySettings = $values['replySettings'] ?? null;
        $this->shareWithFollowers = $values['shareWithFollowers'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
