# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a Google Business Profile location. An `event` or an `offer` needs `title`, `startsAt` and
    # `endsAt`, on the location's own clock; only an `offer` takes `couponCode`, `redeemUrl` and `terms`.
    class GoogleBusinessOptions < Internal::Types::Model
      field :call_to_action, -> { Peal::Types::GoogleBusinessCallToAction }, optional: true, nullable: false, api_name: "callToAction"

      field :call_to_action_url, -> { String }, optional: true, nullable: false, api_name: "callToActionUrl"

      field :coupon_code, -> { String }, optional: true, nullable: false, api_name: "couponCode"

      field :ends_at, -> { String }, optional: true, nullable: false, api_name: "endsAt"

      field :post_type, -> { Peal::Types::GoogleBusinessPostType }, optional: true, nullable: false, api_name: "postType"

      field :redeem_url, -> { String }, optional: true, nullable: false, api_name: "redeemUrl"

      field :starts_at, -> { String }, optional: true, nullable: false, api_name: "startsAt"

      field :terms, -> { String }, optional: true, nullable: false

      field :title, -> { String }, optional: true, nullable: false
    end
  end
end
