# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on an X account. Scheduling needs none of them; `shareWithFollowers` needs `communityId`.
    class XOptions < Internal::Types::Model
      field :community_id, -> { String }, optional: true, nullable: false, api_name: "communityId"

      field :made_with_ai, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "madeWithAi"

      field :paid_partnership, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "paidPartnership"

      field :reply_settings, -> { Peal::Types::XReplySettings }, optional: true, nullable: false, api_name: "replySettings"

      field :share_with_followers, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "shareWithFollowers"
    end
  end
end
