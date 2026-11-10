# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventAdBoostChanged < Internal::Types::Model
      field :boost_id, -> { String }, optional: false, nullable: false, api_name: "boostId"

      field :budget, -> { Peal::Types::Money }, optional: false, nullable: false

      field :budget_digits, -> { Float }, optional: false, nullable: false, api_name: "budgetDigits"

      field :change, -> { Peal::Types::NoticeEventAdBoostChangedChange }, optional: false, nullable: false

      field :ends_at, -> { String }, optional: false, nullable: false, api_name: "endsAt"

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :reason, -> { String }, optional: false, nullable: true
    end
  end
end
