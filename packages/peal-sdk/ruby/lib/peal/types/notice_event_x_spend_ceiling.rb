# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventXSpendCeiling < Internal::Types::Model
      field :ceiling, -> { Integer }, optional: false, nullable: false

      field :percent, -> { Integer }, optional: false, nullable: false

      field :resets_at, -> { String }, optional: false, nullable: false, api_name: "resetsAt"
    end
  end
end
