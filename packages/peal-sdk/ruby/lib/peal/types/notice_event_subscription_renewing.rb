# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventSubscriptionRenewing < Internal::Types::Model
      field :plan, -> { Peal::Types::PaidPlan }, optional: false, nullable: false

      field :price, -> { Peal::Types::Money }, optional: false, nullable: false

      field :renews_at, -> { String }, optional: false, nullable: false, api_name: "renewsAt"
    end
  end
end
