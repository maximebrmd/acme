# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventTrialEnding < Internal::Types::Model
      field :ends_at, -> { String }, optional: false, nullable: false, api_name: "endsAt"

      field :over, -> { Internal::Types::Array[Peal::Types::Excess] }, optional: false, nullable: false

      field :plan, -> { Peal::Types::PaidPlan }, optional: false, nullable: false
    end
  end
end
