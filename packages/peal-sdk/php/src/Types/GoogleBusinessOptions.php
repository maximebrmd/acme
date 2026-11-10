<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

/**
 * How a post goes out on a Google Business Profile location. An `event` or an `offer` needs `title`, `startsAt` and `endsAt`, on the location's own clock; only an `offer` takes `couponCode`, `redeemUrl` and `terms`.
 */
class GoogleBusinessOptions extends JsonSerializableType
{
    /**
     * @var ?value-of<GoogleBusinessCallToAction> $callToAction
     */
    #[JsonProperty('callToAction')]
    public ?string $callToAction;

    /**
     * @var ?string $callToActionUrl
     */
    #[JsonProperty('callToActionUrl')]
    public ?string $callToActionUrl;

    /**
     * @var ?string $couponCode
     */
    #[JsonProperty('couponCode')]
    public ?string $couponCode;

    /**
     * @var ?string $endsAt
     */
    #[JsonProperty('endsAt')]
    public ?string $endsAt;

    /**
     * @var ?value-of<GoogleBusinessPostType> $postType
     */
    #[JsonProperty('postType')]
    public ?string $postType;

    /**
     * @var ?string $redeemUrl
     */
    #[JsonProperty('redeemUrl')]
    public ?string $redeemUrl;

    /**
     * @var ?string $startsAt
     */
    #[JsonProperty('startsAt')]
    public ?string $startsAt;

    /**
     * @var ?string $terms
     */
    #[JsonProperty('terms')]
    public ?string $terms;

    /**
     * @var ?string $title
     */
    #[JsonProperty('title')]
    public ?string $title;

    /**
     * @param array{
     *   callToAction?: ?value-of<GoogleBusinessCallToAction>,
     *   callToActionUrl?: ?string,
     *   couponCode?: ?string,
     *   endsAt?: ?string,
     *   postType?: ?value-of<GoogleBusinessPostType>,
     *   redeemUrl?: ?string,
     *   startsAt?: ?string,
     *   terms?: ?string,
     *   title?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->callToAction = $values['callToAction'] ?? null;
        $this->callToActionUrl = $values['callToActionUrl'] ?? null;
        $this->couponCode = $values['couponCode'] ?? null;
        $this->endsAt = $values['endsAt'] ?? null;
        $this->postType = $values['postType'] ?? null;
        $this->redeemUrl = $values['redeemUrl'] ?? null;
        $this->startsAt = $values['startsAt'] ?? null;
        $this->terms = $values['terms'] ?? null;
        $this->title = $values['title'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
