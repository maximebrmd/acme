# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BestTimesHour < Internal::Types::Model
      field :hour, -> { Integer }, optional: false, nullable: false

      field :median, -> { Peal::Types::BestTimesHourMedian }, optional: false, nullable: true

      field :posts, -> { Integer }, optional: false, nullable: false

      field :weekday, -> { Peal::Types::Weekday }, optional: false, nullable: false
    end
  end
end
